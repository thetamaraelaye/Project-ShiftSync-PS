import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaConfig) {}

  async getLogs(
    userRole: string,
    params: {
      entityType?: string;
      entityId?: string;
      locationId?: string;
      actorId?: string;
      actorRole?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorId) where.actorId = params.actorId;
    if (params.actorRole) where.actorRole = params.actorRole;
    if (params.action) where.action = params.action;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    // If locationId filter: find all shift IDs at that location
    if (params.locationId) {
      const shiftIds = await this.prisma.shift
        .findMany({ where: { locationId: params.locationId }, select: { id: true } })
        .then((shifts) => shifts.map((s) => s.id));

      where.OR = [
        { entityId: { in: shiftIds } },
        { after: { path: ['locationId'], equals: params.locationId } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getShiftHistory(shiftId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityId: shiftId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }
}
