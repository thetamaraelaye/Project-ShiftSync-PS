import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import {
  UpdateUserDto,
  SetSkillsDto,
  SetAvailabilityDto,
  CreateAvailabilityExceptionDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaConfig) {}

  async findAll(userRole: string, requesterId: string, locationId?: string, decertified = false) {
    // decertified=true + locationId: staff who HAD assignments at this location
    // but have no current UserLocation record there (historical data preserved).
    if (decertified && locationId && (userRole === 'ADMIN' || userRole === 'MANAGER')) {
      const shiftIds = await this.prisma.shift
        .findMany({ where: { locationId }, select: { id: true } })
        .then((s) => s.map((x) => x.id));

      // Users who were assigned at this location
      const assignedUserIds = await this.prisma.shiftAssignment
        .findMany({
          where: { shiftId: { in: shiftIds } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((a) => a.map((x) => x.userId));

      // Exclude users who are currently certified there
      const currentlyLinked = await this.prisma.userLocation
        .findMany({ where: { locationId, userId: { in: assignedUserIds } }, select: { userId: true } })
        .then((l) => new Set(l.map((x) => x.userId)));

      const decertifiedIds = assignedUserIds.filter((id) => !currentlyLinked.has(id));

      return this.prisma.user.findMany({
        where: { id: { in: decertifiedIds } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: this.userSelect(),
      });
    }

    if (userRole === 'ADMIN') {
      return this.prisma.user.findMany({
        where: locationId
          ? { locationLinks: { some: { locationId } } }
          : undefined,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: this.userSelect(),
      });
    }

    if (userRole === 'MANAGER') {
      // Managers can only see staff at their locations
      const managedLinks = await this.prisma.userLocation.findMany({
        where: { userId: requesterId, type: 'MANAGED' },
        select: { locationId: true },
      });
      const managedLocationIds = managedLinks.map((l) => l.locationId);

      return this.prisma.user.findMany({
        where: {
          locationLinks: {
            some: {
              locationId: locationId
                ? { in: managedLocationIds.filter((id) => id === locationId) }
                : { in: managedLocationIds },
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: this.userSelect(),
      });
    }

    // Staff can only see themselves
    return this.prisma.user.findMany({
      where: { id: requesterId },
      select: this.userSelect(),
    });
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        skills: { select: { skill: true } },
        availability: { orderBy: { dayOfWeek: 'asc' } },
        availabilityExceptions: { orderBy: { date: 'asc' } },
        locationLinks: {
          include: {
            location: { select: { id: true, name: true, timezone: true, city: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Staff can only see themselves
    if (requesterRole === 'STAFF' && id !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string) {
    // Staff can only update themselves (and only name/timezone/desiredHours — not status)
    if (requesterRole === 'STAFF') {
      if (id !== requesterId) throw new ForbiddenException('Access denied');
      if (dto.status) throw new ForbiddenException('Cannot change own status');
    }

    await this.requireUser(id);
    return this.prisma.user.update({ where: { id }, data: dto, select: this.userSelect() });
  }

  async setSkills(userId: string, dto: SetSkillsDto, requesterId: string, requesterRole: string) {
    if (requesterRole === 'STAFF' && userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
    await this.requireUser(userId);

    // Replace all skills atomically
    await this.prisma.$transaction([
      this.prisma.userSkill.deleteMany({ where: { userId } }),
      ...dto.skills.map((skill) =>
        this.prisma.userSkill.create({ data: { userId, skill } }),
      ),
    ]);

    return this.prisma.userSkill.findMany({ where: { userId } });
  }

  async getAvailability(userId: string) {
    await this.requireUser(userId);
    return {
      recurring: await this.prisma.availability.findMany({
        where: { userId },
        orderBy: { dayOfWeek: 'asc' },
      }),
      exceptions: await this.prisma.availabilityException.findMany({
        where: { userId, date: { gte: new Date() } },
        orderBy: { date: 'asc' },
      }),
    };
  }

  async setAvailability(userId: string, dto: SetAvailabilityDto, requesterId: string, requesterRole: string) {
    if (requesterRole === 'STAFF' && userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
    await this.requireUser(userId);

    // Validate no duplicate days
    const days = dto.availability.map((a) => a.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('Duplicate dayOfWeek entries are not allowed');
    }

    await this.prisma.$transaction([
      this.prisma.availability.deleteMany({ where: { userId } }),
      ...dto.availability.map((a) =>
        this.prisma.availability.create({
          data: { userId, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime },
        }),
      ),
    ]);

    return this.prisma.availability.findMany({ where: { userId }, orderBy: { dayOfWeek: 'asc' } });
  }

  async createAvailabilityException(
    userId: string,
    dto: CreateAvailabilityExceptionDto,
    requesterId: string,
    requesterRole: string,
  ) {
    if (requesterRole === 'STAFF' && userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
    await this.requireUser(userId);

    const date = new Date(dto.date);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.availabilityException.upsert({
      where: { userId_date: { userId, date } },
      update: {
        isUnavailable: dto.isUnavailable ?? true,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
      create: {
        userId,
        date,
        isUnavailable: dto.isUnavailable ?? true,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
    });
  }

  async deleteAvailabilityException(
    userId: string,
    exceptionId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    if (requesterRole === 'STAFF' && userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    const exception = await this.prisma.availabilityException.findUnique({
      where: { id: exceptionId },
    });
    if (!exception || exception.userId !== userId) throw new NotFoundException('Exception not found');

    await this.prisma.availabilityException.delete({ where: { id: exceptionId } });
    return { message: 'Exception removed' };
  }

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      timezone: true,
      desiredWeeklyHours: true,
      createdAt: true,
      skills: { select: { skill: true } },
      locationLinks: {
        select: {
          type: true,
          location: { select: { id: true, name: true, city: true, timezone: true } },
        },
      },
    };
  }
}
