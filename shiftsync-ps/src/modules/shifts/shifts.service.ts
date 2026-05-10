import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { toZonedTime } from 'date-fns-tz';
import { getDay, addDays, startOfDay } from 'date-fns';
import { CreateShiftDto, UpdateShiftDto, PublishWeekDto, WeekScheduleQueryDto } from './dto/shifts.dto';
import { ShiftStatus, Skill } from '@db';

const EDIT_CUTOFF_HOURS = 48;
const PREMIUM_SHIFT_DAYS = [5, 6]; // Friday, Saturday
const PREMIUM_SHIFT_HOUR_START = 18; // 6 PM in location timezone

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaConfig) {}

  async getWeekSchedule(query: WeekScheduleQueryDto, userRole: string, userId: string) {
    const weekStart = new Date(query.weekStart);
    const weekEnd = addDays(weekStart, 7);

    const where: any = {
      startTime: { gte: weekStart, lt: weekEnd },
    };

    if (query.locationId) where.locationId = query.locationId;
    if (query.skill) where.requiredSkill = query.skill as Skill;

    // Staff only see published shifts (or their own assignments)
    if (userRole === 'STAFF') {
      where.OR = [
        { status: ShiftStatus.PUBLISHED },
        { assignments: { some: { userId } } },
      ];
    }

    // Managers see only their assigned locations
    if (userRole === 'MANAGER') {
      const managedLinks = await this.prisma.userLocation.findMany({
        where: { userId, type: 'MANAGED' },
        select: { locationId: true },
      });
      const locationIds = managedLinks.map((l) => l.locationId);
      if (query.locationId) {
        if (!locationIds.includes(query.locationId)) {
          throw new ForbiddenException('No access to this location');
        }
      } else {
        where.locationId = { in: locationIds };
      }
    }

    return this.prisma.shift.findMany({
      where,
      orderBy: [{ startTime: 'asc' }],
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        assignments: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, skills: { select: { skill: true } } },
            },
          },
        },
        _count: { select: { swapRequests: { where: { status: 'PENDING' } } } },
      },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        location: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true, email: true,
                skills: { select: { skill: true } },
              },
            },
          },
        },
        swapRequests: { where: { status: { in: ['PENDING', 'ACCEPTED', 'MANAGER_REVIEW'] } } },
      },
    });

    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(dto: CreateShiftDto, creatorId: string, actorRole: string) {
    await this.checkManagerAccess(dto.locationId, actorRole, creatorId);

    const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundException('Location not found');

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const isPremium = this.checkIfPremium(startTime, location.timezone);

    const shift = await this.prisma.shift.create({
      data: {
        locationId: dto.locationId,
        startTime,
        endTime,
        requiredSkill: dto.requiredSkill,
        headcount: dto.headcount ?? 1,
        notes: dto.notes,
        isPremium,
        createdById: creatorId,
        status: ShiftStatus.DRAFT,
      },
      include: { location: { select: { id: true, name: true, timezone: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'Shift',
        entityId: shift.id,
        action: 'SHIFT_CREATED',
        actorId: creatorId,
        after: { locationId: shift.locationId, startTime, endTime, requiredSkill: shift.requiredSkill },
      },
    });

    return shift;
  }

  async update(id: string, dto: UpdateShiftDto, actorId: string, actorRole: string) {
    const shift = await this.requireShift(id);
    this.checkManagerAccess(shift.locationId, actorRole, actorId);
    this.checkEditCutoff(shift.startTime, shift.status);

    const before = { startTime: shift.startTime, endTime: shift.endTime, requiredSkill: shift.requiredSkill };

    const startTime = dto.startTime ? new Date(dto.startTime) : shift.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : shift.endTime;

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const location = await this.prisma.location.findUnique({ where: { id: shift.locationId } });
    const isPremium = this.checkIfPremium(startTime, location.timezone);

    const updated = await this.prisma.shift.update({
      where: { id },
      data: { ...dto, startTime, endTime, isPremium },
      include: { location: { select: { id: true, name: true, timezone: true } } },
    });

    // Cancel pending swap requests when shift is edited
    const cancelledSwaps = await this.prisma.swapRequest.updateMany({
      where: { shiftId: id, status: { in: ['PENDING', 'ACCEPTED', 'MANAGER_REVIEW'] } },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'Shift',
        entityId: id,
        action: 'SHIFT_UPDATED',
        actorId,
        before,
        after: { startTime: updated.startTime, endTime: updated.endTime, requiredSkill: updated.requiredSkill },
      },
    });

    return { shift: updated, cancelledSwapRequests: cancelledSwaps.count };
  }

  async delete(id: string, actorId: string, actorRole: string) {
    const shift = await this.requireShift(id);
    this.checkManagerAccess(shift.locationId, actorRole, actorId);
    this.checkEditCutoff(shift.startTime, shift.status);

    await this.prisma.shift.delete({ where: { id } });
    return { message: 'Shift deleted' };
  }

  async publishWeek(dto: PublishWeekDto, actorId: string, actorRole: string) {
    await this.checkManagerAccess(dto.locationId, actorRole, actorId);

    const weekStart = new Date(dto.weekStart);
    const weekEnd = addDays(weekStart, 7);

    const result = await this.prisma.shift.updateMany({
      where: {
        locationId: dto.locationId,
        startTime: { gte: weekStart, lt: weekEnd },
        status: ShiftStatus.DRAFT,
      },
      data: { status: ShiftStatus.PUBLISHED },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'Shift',
        entityId: dto.locationId,
        action: 'SCHEDULE_PUBLISHED',
        actorId,
        after: { weekStart: dto.weekStart, locationId: dto.locationId, count: result.count },
      },
    });

    return { published: result.count, weekStart: dto.weekStart };
  }

  async unpublishWeek(
    dto: { weekStart: string; locationId: string; force?: boolean },
    actorId: string,
    actorRole: string,
  ) {
    await this.checkManagerAccess(dto.locationId, actorRole, actorId);

    const weekStart = new Date(dto.weekStart);
    const weekEnd = addDays(weekStart, 7);
    const cutoff = new Date(Date.now() + EDIT_CUTOFF_HOURS * 3600 * 1000);

    // Without force, only unpublish shifts that are still before the edit cutoff
    const where: any = {
      locationId: dto.locationId,
      startTime: { gte: weekStart, lt: weekEnd },
      status: ShiftStatus.PUBLISHED,
    };

    if (!dto.force) {
      where.startTime.gte = cutoff > weekStart ? cutoff : weekStart;
    }

    const result = await this.prisma.shift.updateMany({
      where,
      data: { status: ShiftStatus.DRAFT },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'Shift',
        entityId: dto.locationId,
        action: 'SCHEDULE_UNPUBLISHED',
        actorId,
        after: { weekStart: dto.weekStart, locationId: dto.locationId, count: result.count },
      },
    });

    return { unpublished: result.count };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private checkIfPremium(startTimeUtc: Date, locationTimezone: string): boolean {
    const zonedStart = toZonedTime(startTimeUtc, locationTimezone);
    const dayOfWeek = getDay(zonedStart);
    const hour = zonedStart.getHours();
    return PREMIUM_SHIFT_DAYS.includes(dayOfWeek) && hour >= PREMIUM_SHIFT_HOUR_START;
  }

  private checkEditCutoff(startTime: Date, status: ShiftStatus) {
    if (status === ShiftStatus.PUBLISHED) {
      const cutoff = new Date(startTime.getTime() - EDIT_CUTOFF_HOURS * 3600 * 1000);
      if (new Date() > cutoff) {
        throw new BadRequestException(
          `Cannot edit a published shift within ${EDIT_CUTOFF_HOURS} hours of its start time`,
        );
      }
    }
  }

  private async checkManagerAccess(locationId: string, actorRole: string, actorId: string) {
    if (actorRole === 'ADMIN') return;
    if (actorRole !== 'MANAGER') throw new ForbiddenException('Only managers can modify shifts');

    const link = await this.prisma.userLocation.findFirst({
      where: { userId: actorId, locationId, type: 'MANAGED' },
    });
    if (!link) throw new ForbiddenException('You do not manage this location');
  }

  async requireShift(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }
}
