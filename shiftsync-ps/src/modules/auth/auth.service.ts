import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaConfig } from '@configs/database.config';
import * as argon2 from 'argon2';
import { LoginDto, CreateUserDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';
import { UserRole, UserStatus } from '@db';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaConfig,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        locationLinks: {
          where: { type: 'MANAGED' },
          select: { locationId: true },
        },
        skills: { select: { skill: true } },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is deactivated. Contact your administrator.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const managedLocationIds = user.locationLinks.map((l) => l.locationId);
    const token = this.signToken(user.id, user.role, user.email, managedLocationIds);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          timezone: user.timezone,
          desiredWeeklyHours: user.desiredWeeklyHours,
          skills: user.skills.map((s) => s.skill),
          managedLocationIds,
        },
        accessToken: token,
      },
      message: 'Login successful',
    };
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: UserStatus.ACTIVE,
        desiredWeeklyHours: dto.desiredWeeklyHours,
        timezone: dto.timezone ?? 'America/New_York',
      },
    });

    return {
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      message: 'User created successfully',
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { select: { skill: true } },
        locationLinks: {
          include: { location: { select: { id: true, name: true, timezone: true } } },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        timezone: user.timezone,
        desiredWeeklyHours: user.desiredWeeklyHours,
        skills: user.skills.map((s) => s.skill),
        locations: user.locationLinks.map((l) => ({
          id: l.location.id,
          name: l.location.name,
          timezone: l.location.timezone,
          type: l.type,
        })),
      },
      message: 'Profile retrieved',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException('User not found');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        timezone: true,
        desiredWeeklyHours: true,
      },
    });

    return { data: user, message: 'Profile updated' };
  }

  async validateToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  private signToken(
    userId: string,
    role: UserRole,
    email: string,
    locationIds: string[] = [],
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
      locationIds,
    });
  }
}
