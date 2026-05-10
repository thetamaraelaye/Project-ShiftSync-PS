import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { differenceInMinutes, addDays, subDays, startOfWeek } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaConfig) {}

  // ─── Overtime Analytics ───────────────────────────────────────────────────

  async getOvertimeAnalytics(
    userRole: string,
    userId: string,
    params: { locationId?: string; weekStart?: string },
  ) {
    if (userRole === 'STAFF') throw new ForbiddenException('Access denied');

    const weekStart = params.weekStart
      ? new Date(params.weekStart)
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);

    const locationFilter = await this.buildLocationFilter(userRole, userId, params.locationId);

    // Get all staff assignments this week
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        shift: {
          startTime: { gte: weekStart, lt: weekEnd },
          ...locationFilter,
        },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, desiredWeeklyHours: true } },
        shift: { select: { startTime: true, endTime: true, locationId: true } },
      },
    });

    // Aggregate hours per staff member
    const staffHours: Record<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        desiredWeeklyHours: number | null;
        totalHours: number;
        overtimeHours: number;
        atRisk: boolean;
        overThreshold: boolean;
      }
    > = {};

    for (const a of assignments) {
      const hours = differenceInMinutes(a.shift.endTime, a.shift.startTime) / 60;
      const uid = a.user.id;

      if (!staffHours[uid]) {
        staffHours[uid] = {
          userId: uid,
          firstName: a.user.firstName,
          lastName: a.user.lastName,
          desiredWeeklyHours: a.user.desiredWeeklyHours,
          totalHours: 0,
          overtimeHours: 0,
          atRisk: false,
          overThreshold: false,
        };
      }

      staffHours[uid].totalHours += hours;
    }

    // Calculate risk flags
    for (const s of Object.values(staffHours)) {
      s.overtimeHours = Math.max(0, s.totalHours - 40);
      s.overThreshold = s.totalHours >= 40;
      s.atRisk = s.totalHours >= 35 && s.totalHours < 40;
    }

    const all = Object.values(staffHours).sort((a, b) => b.totalHours - a.totalHours);

    return {
      data: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        summary: {
          totalStaff: all.length,
          atRisk: all.filter((s) => s.atRisk).length,
          overThreshold: all.filter((s) => s.overThreshold).length,
          projectedOvertimeCost: all.reduce((sum, s) => sum + s.overtimeHours * 1.5 * 20, 0), // est. $20/hr base
        },
        staff: all,
      },
      message: 'Overtime analytics retrieved',
    };
  }

  // ─── Fairness Analytics ───────────────────────────────────────────────────

  async getFairnessAnalytics(
    userRole: string,
    userId: string,
    params: { locationId?: string; startDate?: string; endDate?: string },
  ) {
    if (userRole === 'STAFF') throw new ForbiddenException('Access denied');

    const startDate = params.startDate
      ? new Date(params.startDate)
      : subDays(new Date(), 30);
    const endDate = params.endDate ? new Date(params.endDate) : new Date();

    const locationFilter = await this.buildLocationFilter(userRole, userId, params.locationId);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        shift: {
          startTime: { gte: startDate, lte: endDate },
          ...locationFilter,
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, desiredWeeklyHours: true },
        },
        shift: {
          select: {
            startTime: true,
            endTime: true,
            isPremium: true,
            requiredSkill: true,
            locationId: true,
          },
        },
      },
    });

    // Aggregate fairness metrics per staff
    const staffMetrics: Record<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        desiredWeeklyHours: number | null;
        totalHours: number;
        totalShifts: number;
        premiumShifts: number;
        premiumHours: number;
        fairnessScore: number;
      }
    > = {};

    for (const a of assignments) {
      const uid = a.user.id;
      const hours = differenceInMinutes(a.shift.endTime, a.shift.startTime) / 60;

      if (!staffMetrics[uid]) {
        staffMetrics[uid] = {
          userId: uid,
          firstName: a.user.firstName,
          lastName: a.user.lastName,
          desiredWeeklyHours: a.user.desiredWeeklyHours,
          totalHours: 0,
          totalShifts: 0,
          premiumShifts: 0,
          premiumHours: 0,
          fairnessScore: 0,
        };
      }

      staffMetrics[uid].totalHours += hours;
      staffMetrics[uid].totalShifts += 1;

      if (a.shift.isPremium) {
        staffMetrics[uid].premiumShifts += 1;
        staffMetrics[uid].premiumHours += hours;
      }
    }

    const all = Object.values(staffMetrics);
    const totalPremiumShifts = all.reduce((s, m) => s + m.premiumShifts, 0);
    const staffCount = all.length;

    // Fairness score: how close to equal distribution of premium shifts
    // 100 = perfectly equal, lower = more imbalanced
    const avgPremium = staffCount > 0 ? totalPremiumShifts / staffCount : 0;
    for (const m of all) {
      if (avgPremium === 0) {
        m.fairnessScore = 100;
      } else {
        const deviation = Math.abs(m.premiumShifts - avgPremium) / avgPremium;
        m.fairnessScore = Math.max(0, Math.round((1 - deviation) * 100));
      }
    }

    all.sort((a, b) => b.premiumShifts - a.premiumShifts);

    return {
      data: {
        period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        summary: {
          totalPremiumShifts,
          staffCount,
          averagePremiumPerStaff: avgPremium.toFixed(1),
          overScheduled: all.filter(
            (m) => m.desiredWeeklyHours && m.totalHours / 4 > m.desiredWeeklyHours * 1.2,
          ).length,
          underScheduled: all.filter(
            (m) => m.desiredWeeklyHours && m.totalHours / 4 < m.desiredWeeklyHours * 0.8,
          ).length,
        },
        staff: all,
      },
      message: 'Fairness analytics retrieved',
    };
  }

  // ─── Dashboard stats ──────────────────────────────────────────────────────

  async getDashboardStats(userRole: string, userId: string) {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);

    const locationFilter = await this.buildLocationFilter(userRole, userId);

    const managedLocationIds =
      userRole === 'MANAGER' ? await this.getManagedLocationIds(userId) : [];

    const [
      totalStaff,
      shiftsThisWeek,
      publishedShifts,
      pendingApprovals,
      overtimeAtRisk,
      onDutyNow,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: 'STAFF',
          status: 'ACTIVE',
          ...(userRole === 'MANAGER'
            ? {
                locationLinks: {
                  some: {
                    type: 'CERTIFIED',
                    locationId: { in: managedLocationIds },
                  },
                },
              }
            : {}),
        },
      }),

      this.prisma.shift.count({
        where: { startTime: { gte: weekStart, lt: weekEnd }, ...locationFilter },
      }),

      this.prisma.shift.count({
        where: {
          startTime: { gte: weekStart, lt: weekEnd },
          status: 'PUBLISHED',
          ...locationFilter,
        },
      }),

      this.prisma.swapRequest.count({
        where: {
          status: 'MANAGER_REVIEW',
          ...(userRole === 'MANAGER'
            ? {
                shift: {
                  locationId: { in: managedLocationIds },
                },
              }
            : {}),
        },
      }),

      // Staff who are at 35+ hours this week
      this.getOvertimeAtRiskCount(weekStart, weekEnd, locationFilter),

      // Staff currently in an active shift
      this.prisma.shiftAssignment.count({
        where: {
          status: { not: 'CANCELLED' },
          shift: { startTime: { lte: now }, endTime: { gte: now }, ...locationFilter },
        },
      }),
    ]);

    return {
      data: {
        totalStaff,
        shiftsThisWeek,
        publishedShifts,
        draftShifts: shiftsThisWeek - publishedShifts,
        pendingApprovals,
        overtimeAtRisk,
        onDutyNow,
      },
      message: 'Dashboard stats retrieved',
    };
  }

  async getOnDutyNow(userRole: string, userId: string) {
    const now = new Date();
    const locationFilter = await this.buildLocationFilter(userRole, userId);

    return this.prisma.shiftAssignment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        shift: {
          startTime: { lte: now },
          endTime: { gte: now },
          ...locationFilter,
        },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        shift: {
          include: { location: { select: { id: true, name: true, timezone: true } } },
        },
      },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async buildLocationFilter(
    userRole: string,
    userId: string,
    locationId?: string,
  ): Promise<any> {
    if (userRole === 'ADMIN') {
      return locationId ? { locationId } : {};
    }

    // Manager: only their managed locations
    const managedIds = await this.getManagedLocationIds(userId);

    if (locationId && managedIds.includes(locationId)) {
      return { locationId };
    }

    return { locationId: { in: managedIds } };
  }

  private async getOvertimeAtRiskCount(
    weekStart: Date,
    weekEnd: Date,
    locationFilter: any,
  ): Promise<number> {
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        shift: { startTime: { gte: weekStart, lt: weekEnd }, ...locationFilter },
      },
      include: {
        shift: { select: { startTime: true, endTime: true } },
      },
    });

    const userHours: Record<string, number> = {};
    for (const a of assignments) {
      const hours = differenceInMinutes(a.shift.endTime, a.shift.startTime) / 60;
      userHours[a.userId] = (userHours[a.userId] || 0) + hours;
    }

    return Object.values(userHours).filter((h) => h >= 35).length;
  }

  private async getManagedLocationIds(userId: string): Promise<string[]> {
    const managedLinks = await this.prisma.userLocation.findMany({
      where: { userId, type: 'MANAGED' },
      select: { locationId: true },
    });

    return managedLinks.map((l) => l.locationId);
  }
}
