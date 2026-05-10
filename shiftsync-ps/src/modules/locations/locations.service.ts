import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { CreateLocationDto, UpdateLocationDto, AssignUserToLocationDto } from './dto/locations.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaConfig) {}

  async findAll(userRole: string, userId: string) {
    if (userRole === 'ADMIN') {
      return this.prisma.location.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { shifts: true, userLinks: true } } },
      });
    }

    // Managers and staff only see their assigned locations
    const links = await this.prisma.userLocation.findMany({
      where: { userId },
      select: { locationId: true },
    });
    const ids = links.map((l) => l.locationId);

    return this.prisma.location.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { shifts: true, userLinks: true } } },
    });
  }

  async findOne(id: string, userRole: string, userId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        userLinks: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!location) throw new NotFoundException('Location not found');

    if (userRole !== 'ADMIN') {
      const hasAccess = location.userLinks.some((l) => l.userId === userId);
      if (!hasAccess) throw new ForbiddenException('No access to this location');
    }

    return location;
  }

  async create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findById(id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async assignUser(locationId: string, dto: AssignUserToLocationDto) {
    await this.findById(locationId);

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check if already assigned with same type
    const existing = await this.prisma.userLocation.findUnique({
      where: { userId_locationId_type: { userId: dto.userId, locationId, type: dto.type } },
    });
    if (existing) throw new ConflictException('User already has this assignment at this location');

    return this.prisma.userLocation.create({
      data: { userId: dto.userId, locationId, type: dto.type },
    });
  }

  async removeUser(locationId: string, userId: string, type: string) {
    const link = await this.prisma.userLocation.findFirst({
      where: { userId, locationId, type: type as any },
    });
    if (!link) throw new NotFoundException('Assignment not found');

    return this.prisma.userLocation.delete({ where: { id: link.id } });
  }

  async getStaff(locationId: string) {
    await this.findById(locationId);

    return this.prisma.userLocation.findMany({
      where: { locationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
            desiredWeeklyHours: true,
            skills: { select: { skill: true } },
          },
        },
      },
    });
  }

  private async findById(id: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }
}
