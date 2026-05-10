import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { toZonedTime } from 'date-fns-tz';
import {
  differenceInMinutes,
  subDays,
  addDays,
  getDay,
  formatISO,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViolationRule =
  | 'DOUBLE_BOOKING'
  | 'REST_PERIOD'
  | 'SKILL_MISMATCH'
  | 'CERT_MISSING'
  | 'UNAVAILABLE'
  | 'AVAILABILITY_EXCEPTION'
  | 'DAILY_HOURS_HARD'
  | 'SEVENTH_DAY_BLOCK';

export type WarningRule =
  | 'DAILY_HOURS_SOFT'
  | 'WEEKLY_HOURS_35'
  | 'WEEKLY_HOURS_APPROACHING_OT'
  | 'CONSECUTIVE_6TH_DAY'
  | 'CONSECUTIVE_7TH_REQUIRES_OVERRIDE';

export interface Violation {
  rule: ViolationRule;
  message: string;
}

export interface Warning {
  rule: WarningRule;
  message: string;
  currentValue?: number;
  projectedValue?: number;
}

export interface StaffSuggestion {
  userId: string;
  firstName: string;
  lastName: string;
  weeklyHours: number;
  warnings: Warning[];
}

export interface ConstraintResult {
  valid: boolean;
  violations: Violation[];
  warnings: Warning[];
  suggestions?: StaffSuggestion[];
}

const REST_HOURS = 10;
const MAX_DAILY_HOURS_SOFT = 8;
const MAX_DAILY_HOURS_HARD = 12;
const WEEKLY_HOURS_WARNING = 35;
const WEEKLY_HOURS_OT = 40;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SchedulingConstraintService {
  constructor(private prisma: PrismaConfig) {}

  /**
   * Run all constraint checks before creating a ShiftAssignment.
   * Pass a Prisma transaction client when called inside a $transaction.
   */
  async check(
    shiftId: string,
    userId: string,
    tx?: any,
    overrideReason?: string,
    skipSuggestions = false,
  ): Promise<ConstraintResult> {
    const db = tx ?? this.prisma;

    const [shift, user] = await Promise.all([
      db.shift.findUnique({
        where: { id: shiftId },
        include: { location: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        include: {
          skills: { select: { skill: true } },
          locationLinks: { select: { locationId: true, type: true } },
          availability: true,
          availabilityExceptions: true,
        },
      }),
    ]);

    if (!shift) throw new BadRequestException('Shift not found');
    if (!user) throw new BadRequestException('User not found');

    const violations: Violation[] = [];
    const warnings: Warning[] = [];

    // ── Rule 1: Skill match ───────────────────────────────────────────────────
    const hasSkill = user.skills.some((s) => s.skill === shift.requiredSkill);
    if (!hasSkill) {
      violations.push({
        rule: 'SKILL_MISMATCH',
        message: `${user.firstName} does not have the required skill: ${shift.requiredSkill.toLowerCase().replace('_', ' ')}`,
      });
    }

    // ── Rule 2: Location certification ───────────────────────────────────────
    const hasCert = user.locationLinks.some(
      (l) => l.locationId === shift.locationId && l.type === 'CERTIFIED',
    );
    if (!hasCert) {
      violations.push({
        rule: 'CERT_MISSING',
        message: `${user.firstName} is not certified to work at ${shift.location.name}`,
      });
    }

    // ── Rule 3: Availability exception (specific date) ────────────────────────
    const shiftDateInLocationTz = toZonedTime(shift.startTime, shift.location.timezone);
    const shiftDateUtcMidnight = new Date(shiftDateInLocationTz);
    shiftDateUtcMidnight.setUTCHours(0, 0, 0, 0);

    // Compare by year/month/day in location timezone
    const shiftLocalDateStr = formatISO(shiftDateInLocationTz, { representation: 'date' });

    const exception = user.availabilityExceptions.find((e) => {
      const exDate = toZonedTime(e.date, shift.location.timezone);
      return formatISO(exDate, { representation: 'date' }) === shiftLocalDateStr;
    });

    if (exception) {
      if (exception.isUnavailable) {
        violations.push({
          rule: 'AVAILABILITY_EXCEPTION',
          message: `${user.firstName} has marked ${shiftLocalDateStr} as unavailable${exception.reason ? `: ${exception.reason}` : ''}`,
        });
      } else if (exception.startTime && exception.endTime) {
        // Check if shift fits within the exception window
        const available = this.checkTimeWindow(
          shift.startTime,
          shift.endTime,
          exception.startTime,
          exception.endTime,
          user.timezone,
          shift.location.timezone,
        );
        if (!available) {
          violations.push({
            rule: 'AVAILABILITY_EXCEPTION',
            message: `${user.firstName} is only available ${exception.startTime}–${exception.endTime} on ${shiftLocalDateStr}`,
          });
        }
      }
    } else {
      // ── Rule 4: Recurring availability ───────────────────────────────────────
      const shiftDayOfWeek = getDay(shiftDateInLocationTz); // 0=Sun … 6=Sat
      const availWindow = user.availability.find((a) => a.dayOfWeek === shiftDayOfWeek);

      if (!availWindow) {
        violations.push({
          rule: 'UNAVAILABLE',
          message: `${user.firstName} has no availability set for ${this.dayName(shiftDayOfWeek)}s`,
        });
      } else {
        const available = this.checkTimeWindow(
          shift.startTime,
          shift.endTime,
          availWindow.startTime,
          availWindow.endTime,
          user.timezone,
          shift.location.timezone,
        );
        if (!available) {
          violations.push({
            rule: 'UNAVAILABLE',
            message: `${user.firstName}'s availability on ${this.dayName(shiftDayOfWeek)}s is ${availWindow.startTime}–${availWindow.endTime} (${user.timezone}) — shift falls outside this window`,
          });
        }
      }
    }

    // ── Rule 5: Double booking ────────────────────────────────────────────────
    const overlapping = await db.shiftAssignment.findFirst({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        shiftId: { not: shiftId },
        shift: {
          startTime: { lt: shift.endTime },
          endTime: { gt: shift.startTime },
        },
      },
      include: { shift: { include: { location: { select: { name: true } } } } },
    });

    if (overlapping) {
      const conflictStart = overlapping.shift.startTime.toISOString().slice(11, 16);
      const conflictEnd = overlapping.shift.endTime.toISOString().slice(11, 16);
      violations.push({
        rule: 'DOUBLE_BOOKING',
        message: `${user.firstName} is already assigned to a shift at ${overlapping.shift.location.name} (${conflictStart}–${conflictEnd} UTC) — times overlap`,
      });
    }

    // ── Rule 6: 10-hour rest period ───────────────────────────────────────────
    const recentShift = await db.shiftAssignment.findFirst({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        shiftId: { not: shiftId },
        shift: {
          OR: [
            {
              endTime: {
                gt: new Date(shift.startTime.getTime() - REST_HOURS * 3600 * 1000),
                lte: shift.startTime,
              },
            },
            {
              startTime: {
                gte: shift.endTime,
                lt: new Date(shift.endTime.getTime() + REST_HOURS * 3600 * 1000),
              },
            },
          ],
        },
      },
      include: { shift: true },
      orderBy: { shift: { endTime: 'desc' } },
    });

    if (recentShift) {
      const gapMinutes = Math.min(
        Math.abs(differenceInMinutes(shift.startTime, recentShift.shift.endTime)),
        Math.abs(differenceInMinutes(recentShift.shift.startTime, shift.endTime)),
      );
      const gapHours = (gapMinutes / 60).toFixed(1);
      violations.push({
        rule: 'REST_PERIOD',
        message: `${user.firstName} requires ${REST_HOURS} hours rest between shifts — only ${gapHours}h gap`,
      });
    }

    // ── Rule 7: Daily hours ───────────────────────────────────────────────────
    const shiftDurationHours = differenceInMinutes(shift.endTime, shift.startTime) / 60;

    const dayStartUtc = new Date(shiftDateInLocationTz);
    dayStartUtc.setHours(0, 0, 0, 0);
    const dayEndUtc = addDays(dayStartUtc, 1);

    const dayAssignments = await db.shiftAssignment.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        shiftId: { not: shiftId },
        shift: {
          startTime: { lt: dayEndUtc },
          endTime: { gt: dayStartUtc },
        },
      },
      include: { shift: true },
    });

    const existingDailyHours = dayAssignments.reduce(
      (sum, a) => sum + differenceInMinutes(a.shift.endTime, a.shift.startTime) / 60,
      0,
    );
    const projectedDailyHours = existingDailyHours + shiftDurationHours;

    if (projectedDailyHours > MAX_DAILY_HOURS_HARD) {
      violations.push({
        rule: 'DAILY_HOURS_HARD',
        message: `This would put ${user.firstName} at ${projectedDailyHours.toFixed(1)}h in a single day — exceeds the ${MAX_DAILY_HOURS_HARD}h daily maximum`,
      });
    } else if (projectedDailyHours > MAX_DAILY_HOURS_SOFT) {
      warnings.push({
        rule: 'DAILY_HOURS_SOFT',
        message: `${user.firstName} would work ${projectedDailyHours.toFixed(1)}h on this day — above the ${MAX_DAILY_HOURS_SOFT}h recommended limit`,
        currentValue: existingDailyHours,
        projectedValue: projectedDailyHours,
      });
    }

    // ── Rule 8: Weekly hours ──────────────────────────────────────────────────
    const weeklyHours = await this.getWeeklyHours(userId, shift.startTime, shiftId, db);
    const projectedWeekly = weeklyHours + shiftDurationHours;

    if (projectedWeekly >= WEEKLY_HOURS_OT) {
      warnings.push({
        rule: 'WEEKLY_HOURS_APPROACHING_OT',
        message: `Adding this shift would bring ${user.firstName} to ${projectedWeekly.toFixed(1)}h this week — exceeds 40h overtime threshold`,
        currentValue: weeklyHours,
        projectedValue: projectedWeekly,
      });
    } else if (projectedWeekly >= WEEKLY_HOURS_WARNING) {
      warnings.push({
        rule: 'WEEKLY_HOURS_35',
        message: `${user.firstName} would be at ${projectedWeekly.toFixed(1)}h this week — approaching 40h overtime`,
        currentValue: weeklyHours,
        projectedValue: projectedWeekly,
      });
    }

    // ── Rule 9–10: Consecutive days ───────────────────────────────────────────
    const consecutiveDays = await this.countConsecutiveDays(userId, shift.startTime, shift.location.timezone, db);

    if (consecutiveDays >= 7) {
      if (!overrideReason) {
        violations.push({
          rule: 'SEVENTH_DAY_BLOCK',
          message: `${user.firstName} would be working their 7th consecutive day. A manager override with documented reason is required.`,
        });
      }
    } else if (consecutiveDays === 6) {
      warnings.push({
        rule: 'CONSECUTIVE_6TH_DAY',
        message: `${user.firstName} would be working their 6th consecutive day this week`,
        currentValue: consecutiveDays,
        projectedValue: consecutiveDays + 1,
      });
    }

    const valid = violations.length === 0;

    // ── Suggestions: when blocked, find alternatives ──────────────────────────
    // Pass skipSuggestions=true when called recursively from findSuggestions
    // to prevent infinite recursion if candidate also has violations.
    let suggestions: StaffSuggestion[] | undefined;
    if (!valid && !skipSuggestions) {
      suggestions = await this.findSuggestions(shiftId, userId, db);
    }

    return { valid, violations, warnings, suggestions };
  }

  // ─── Suggestions Engine ───────────────────────────────────────────────────────

  private async findSuggestions(
    shiftId: string,
    excludeUserId: string,
    db: any,
  ): Promise<StaffSuggestion[]> {
    const shift = await db.shift.findUnique({
      where: { id: shiftId },
      include: { location: true },
    });

    // Find staff with the right skill AND cert for this location
    const candidates = await db.user.findMany({
      where: {
        id: { not: excludeUserId },
        role: 'STAFF',
        status: 'ACTIVE',
        skills: { some: { skill: shift.requiredSkill } },
        locationLinks: { some: { locationId: shift.locationId, type: 'CERTIFIED' } },
      },
      include: {
        skills: { select: { skill: true } },
        locationLinks: { select: { locationId: true, type: true } },
        availability: true,
        availabilityExceptions: true,
      },
      take: 20,
    });

    const results: StaffSuggestion[] = [];

    for (const candidate of candidates) {
      // skipSuggestions=true prevents recursive findSuggestions explosion
      const result = await this.check(shiftId, candidate.id, db, undefined, true);
      if (result.valid) {
        const weeklyHours = await this.getWeeklyHours(candidate.id, shift.startTime, shiftId, db);
        results.push({
          userId: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          weeklyHours,
          warnings: result.warnings,
        });
      }
      if (results.length >= 5) break;
    }

    return results;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getWeeklyHours(
    userId: string,
    refDate: Date,
    excludeShiftId: string,
    db: any,
  ): Promise<number> {
    // Week = Monday to Sunday containing refDate
    const day = refDate.getDay(); // 0=Sun
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(refDate);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);
    const weekEnd = addDays(weekStart, 7);

    const assignments = await db.shiftAssignment.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        shiftId: { not: excludeShiftId },
        shift: { startTime: { gte: weekStart, lt: weekEnd } },
      },
      include: { shift: { select: { startTime: true, endTime: true } } },
    });

    return assignments.reduce(
      (sum: number, a: any) =>
        sum + differenceInMinutes(a.shift.endTime, a.shift.startTime) / 60,
      0,
    );
  }

  private async countConsecutiveDays(
    userId: string,
    shiftDate: Date,
    locationTimezone: string,
    db: any,
  ): Promise<number> {
    // Single query: fetch all assignments in the 7-day window, then count in memory
    const localDate = toZonedTime(shiftDate, locationTimezone);
    const windowStart = subDays(localDate, 7);

    const assignments = await db.shiftAssignment.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        shift: {
          startTime: { gte: windowStart, lt: shiftDate },
        },
      },
      include: { shift: { select: { startTime: true } } },
    });

    // Build a Set of worked calendar days (YYYY-MM-DD in location timezone)
    const workedDays = new Set(
      assignments.map((a: any) => {
        const d = toZonedTime(a.shift.startTime, locationTimezone);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );

    // Count consecutive days going backwards from yesterday
    let consecutive = 0;
    let checkDate = subDays(localDate, 1);

    for (let i = 0; i < 7; i++) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (!workedDays.has(key)) break;
      consecutive++;
      checkDate = subDays(checkDate, 1);
    }

    return consecutive;
  }

  private checkTimeWindow(
    shiftStart: Date,
    shiftEnd: Date,
    availStartStr: string,
    availEndStr: string,
    userTimezone: string,
    locationTimezone: string,
  ): boolean {
    // Convert shift times to user's timezone for comparison
    const shiftStartInUserTz = toZonedTime(shiftStart, userTimezone);
    const shiftEndInUserTz = toZonedTime(shiftEnd, userTimezone);

    const [availStartH, availStartM] = availStartStr.split(':').map(Number);
    const [availEndH, availEndM] = availEndStr.split(':').map(Number);

    const shiftStartMinutes = shiftStartInUserTz.getHours() * 60 + shiftStartInUserTz.getMinutes();
    const shiftEndMinutes = shiftEndInUserTz.getHours() * 60 + shiftEndInUserTz.getMinutes();
    const availStartMinutes = availStartH * 60 + availStartM;
    const availEndMinutes = availEndH * 60 + availEndM;

    // Handle availability windows that don't cross midnight
    if (availEndMinutes > availStartMinutes) {
      return shiftStartMinutes >= availStartMinutes && shiftEndMinutes <= availEndMinutes;
    }

    // Availability crosses midnight (e.g. 22:00–06:00)
    return shiftStartMinutes >= availStartMinutes || shiftEndMinutes <= availEndMinutes;
  }

  private dayName(day: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
  }
}
