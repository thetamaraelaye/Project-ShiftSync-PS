import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { SchedulingConstraintService } from '../scheduling/constraint.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { subHours, addDays } from 'date-fns';
import { CreateSwapRequestDto, RespondToSwapDto, ManagerApprovalDto } from './dto/coverage.dto';

const MAX_PENDING_REQUESTS = 3;
const DROP_EXPIRY_HOURS = 24; // DROP requests expire 24h before shift start

@Injectable()
export class CoverageService {
  constructor(
    private prisma: PrismaConfig,
    private constraintService: SchedulingConstraintService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Create a swap or drop request ───────────────────────────────────────────

  async createRequest(dto: CreateSwapRequestDto, requesterId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: { location: { select: { id: true, name: true, timezone: true } } },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    // Verify the requester is assigned to this shift
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { shiftId: dto.shiftId, userId: requesterId, status: { not: 'CANCELLED' } },
    });
    if (!assignment) {
      throw new BadRequestException('You are not assigned to this shift');
    }

    // Enforce 3-request cap
    const pendingCount = await this.prisma.swapRequest.count({
      where: {
        requesterId,
        status: { in: ['PENDING', 'ACCEPTED', 'MANAGER_REVIEW'] },
      },
    });
    if (pendingCount >= MAX_PENDING_REQUESTS) {
      throw new BadRequestException(
        `Cannot have more than ${MAX_PENDING_REQUESTS} pending requests at once`,
      );
    }

    // No duplicate active request for same shift
    const existingRequest = await this.prisma.swapRequest.findFirst({
      where: {
        shiftId: dto.shiftId,
        requesterId,
        status: { in: ['PENDING', 'ACCEPTED', 'MANAGER_REVIEW'] },
      },
    });
    if (existingRequest) {
      throw new ConflictException('You already have an active request for this shift');
    }

    // For SWAP: validate target exists and is different from requester
    if (dto.type === 'SWAP') {
      if (!dto.targetId) throw new BadRequestException('targetId is required for swap requests');
      if (dto.targetId === requesterId) {
        throw new BadRequestException('Cannot swap a shift with yourself');
      }

      // Validate target is qualified for this shift (run constraint check)
      const targetCheck = await this.constraintService.check(dto.shiftId, dto.targetId);
      if (!targetCheck.valid) {
        const messages = targetCheck.violations.map((v) => v.message).join('; ');
        throw new BadRequestException(`Target staff member cannot take this shift: ${messages}`);
      }
    }

    const expiresAt =
      dto.type === 'DROP' ? subHours(shift.startTime, DROP_EXPIRY_HOURS) : addDays(new Date(), 7);

    const request = await this.prisma.swapRequest.create({
      data: {
        requesterId,
        targetId: dto.targetId,
        shiftId: dto.shiftId,
        type: dto.type,
        reason: dto.reason,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
        shift: { include: { location: { select: { id: true, name: true } } } },
      },
    });

    // Notify target for SWAP requests
    if (dto.type === 'SWAP' && dto.targetId) {
      this.eventEmitter.emit('notification.send', {
        userId: dto.targetId,
        type: 'SWAP_REQUEST',
        title: 'Shift swap request',
        message: `${request.requester.firstName} wants to swap their shift at ${request.shift.location.name} with you`,
        metadata: { requestId: request.id, shiftId: dto.shiftId },
      });

      this.eventEmitter.emit('swap.requested', {
        requestId: request.id,
        targetId: dto.targetId,
        shiftId: dto.shiftId,
        locationId: shift.locationId,
      });
    }

    return { data: request, message: `${dto.type} request created` };
  }

  // ─── Target staff responds to a SWAP request ──────────────────────────────

  async respondToSwap(requestId: string, dto: RespondToSwapDto, responderId: string) {
    const request = await this.requireRequest(requestId);

    if (request.type !== 'SWAP') {
      throw new BadRequestException('Can only respond to SWAP requests');
    }
    if (request.targetId !== responderId) {
      throw new ForbiddenException('Only the target staff member can respond to this request');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const newStatus = dto.response === 'ACCEPTED' ? 'MANAGER_REVIEW' : 'REJECTED';

    const updated = await this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        shift: { include: { location: { select: { id: true, name: true } } } },
      },
    });

    // Notify requester
    this.eventEmitter.emit('notification.send', {
      userId: request.requesterId,
      type: 'SWAP_ACCEPTED',
      title: dto.response === 'ACCEPTED' ? 'Swap request accepted' : 'Swap request declined',
      message:
        dto.response === 'ACCEPTED'
          ? `Your swap request for ${updated.shift.location.name} was accepted — awaiting manager approval`
          : `Your swap request for ${updated.shift.location.name} was declined`,
      metadata: { requestId, shiftId: request.shiftId },
    });

    this.eventEmitter.emit('swap.status_changed', {
      requestId,
      status: newStatus,
      requesterId: request.requesterId,
      targetId: request.targetId,
    });

    return { data: updated, message: `Swap ${dto.response.toLowerCase()}` };
  }

  // ─── Manager approves or rejects ──────────────────────────────────────────

  async managerDecision(
    requestId: string,
    dto: ManagerApprovalDto,
    actorId: string,
    actorRole: string,
  ) {
    const request = await this.requireRequest(requestId);

    // Determine which statuses are valid for manager action
    const validStatuses = request.type === 'SWAP' ? ['MANAGER_REVIEW'] : ['PENDING'];
    if (!validStatuses.includes(request.status)) {
      throw new BadRequestException(`Request cannot be actioned in status: ${request.status}`);
    }

    // Admin has global access. Manager must manage the location.
    if (actorRole !== 'ADMIN') {
      const hasAccess = await this.prisma.userLocation.findFirst({
        where: { userId: actorId, locationId: request.shift.locationId, type: 'MANAGED' },
      });
      if (!hasAccess) throw new ForbiddenException('You do not manage this location');
    }

    if (dto.decision === 'APPROVED') {
      await this.executeApprovedSwap(request, actorId);
    } else {
      await this.prisma.swapRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
    }

    const notifyUserIds = [request.requesterId, request.targetId].filter(Boolean);
    for (const userId of notifyUserIds) {
      this.eventEmitter.emit('notification.send', {
        userId,
        type: 'SWAP_RESOLVED',
        title: `Coverage request ${dto.decision.toLowerCase()}`,
        message: `Your ${request.type} request for ${request.shift.location.name} was ${dto.decision.toLowerCase()} by the manager`,
        metadata: { requestId, shiftId: request.shiftId },
      });
    }

    this.eventEmitter.emit('swap.status_changed', {
      requestId,
      status: dto.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      requesterId: request.requesterId,
      targetId: request.targetId,
      locationId: request.shift.locationId,
    });

    return { message: `Request ${dto.decision.toLowerCase()}` };
  }

  // ─── Staff picks up an open (DROP) shift ─────────────────────────────────

  async pickupShift(shiftId: string, pickerId: string) {
    // Check for open DROP request
    const dropRequest = await this.prisma.swapRequest.findFirst({
      where: { shiftId, type: 'DROP', status: 'PENDING' },
      include: {
        shift: { include: { location: { select: { id: true, name: true } } } },
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!dropRequest) {
      throw new NotFoundException('No open drop request found for this shift');
    }

    if (dropRequest.requesterId === pickerId) {
      throw new BadRequestException('You cannot pick up your own dropped shift');
    }

    // Validate picker qualifications
    const pickerCheck = await this.constraintService.check(shiftId, pickerId);
    if (!pickerCheck.valid) {
      const messages = pickerCheck.violations.map((v) => v.message).join('; ');
      throw new BadRequestException(`You cannot pick up this shift: ${messages}`);
    }

    // Move to manager review
    const updated = await this.prisma.swapRequest.update({
      where: { id: dropRequest.id },
      data: { targetId: pickerId, status: 'MANAGER_REVIEW' },
    });

    this.eventEmitter.emit('notification.send', {
      userId: dropRequest.requesterId,
      type: 'COVERAGE_REQUEST',
      title: 'Someone wants to pick up your shift',
      message: `A staff member wants to pick up your drop at ${dropRequest.shift.location.name} — awaiting manager approval`,
      metadata: { requestId: dropRequest.id, shiftId },
    });

    return { data: updated, message: 'Pickup request submitted for manager approval' };
  }

  // ─── Cancel own request ───────────────────────────────────────────────────

  async cancelRequest(requestId: string, requesterId: string) {
    const request = await this.requireRequest(requestId);

    if (request.requesterId !== requesterId) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }

    if (['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(request.status)) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    await this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    // Notify target if there was one
    if (request.targetId) {
      this.eventEmitter.emit('notification.send', {
        userId: request.targetId,
        type: 'SWAP_RESOLVED',
        title: 'Swap request cancelled',
        message: `The swap request for ${request.shift.location.name} was cancelled by the requester`,
        metadata: { requestId, shiftId: request.shiftId },
      });
    }

    return { message: 'Request cancelled' };
  }

  // ─── Query endpoints ──────────────────────────────────────────────────────

  async getMyRequests(userId: string) {
    return this.prisma.swapRequest.findMany({
      where: {
        OR: [{ requesterId: userId }, { targetId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
        shift: { include: { location: { select: { id: true, name: true, timezone: true } } } },
      },
    });
  }

  async getPendingApprovals(actorId: string, actorRole: string) {
    let locationIds: string[] = [];

    if (actorRole !== 'ADMIN') {
      const managedLinks = await this.prisma.userLocation.findMany({
        where: { userId: actorId, type: 'MANAGED' },
        select: { locationId: true },
      });
      locationIds = managedLinks.map((l) => l.locationId);
    }

    return this.prisma.swapRequest.findMany({
      where: {
        status: 'MANAGER_REVIEW',
        ...(actorRole === 'ADMIN' ? {} : { shift: { locationId: { in: locationIds } } }),
      },
      orderBy: { updatedAt: 'asc' },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
        shift: { include: { location: { select: { id: true, name: true, timezone: true } } } },
      },
    });
  }

  async getOpenShifts(userId: string) {
    // Find open DROP requests for shifts the user is qualified for
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { select: { skill: true } },
        locationLinks: { select: { locationId: true, type: true } },
      },
    });

    const certifiedLocationIds = user.locationLinks
      .filter((l) => l.type === 'CERTIFIED')
      .map((l) => l.locationId);

    const userSkills = user.skills.map((s) => s.skill);

    return this.prisma.swapRequest.findMany({
      where: {
        type: 'DROP',
        status: 'PENDING',
        requesterId: { not: userId },
        expiresAt: { gt: new Date() },
        shift: {
          locationId: { in: certifiedLocationIds },
          requiredSkill: { in: userSkills },
          startTime: { gt: new Date() },
        },
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        shift: {
          include: {
            location: { select: { id: true, name: true, timezone: true } },
            _count: { select: { assignments: { where: { status: { not: 'CANCELLED' } } } } },
          },
        },
      },
    });
  }

  // ─── Bull job: expire stale DROP requests ────────────────────────────────

  async expireStaleRequests() {
    const result = await this.prisma.swapRequest.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async executeApprovedSwap(request: any, managerId: string) {
    await this.prisma.$transaction(async (tx) => {
      if (request.type === 'SWAP') {
        // Transfer the shift assignment from requester to target
        await tx.shiftAssignment.updateMany({
          where: {
            shiftId: request.shiftId,
            userId: request.requesterId,
            status: { not: 'CANCELLED' },
          },
          data: { status: 'CANCELLED' },
        });

        await tx.shiftAssignment.create({
          data: {
            shiftId: request.shiftId,
            userId: request.targetId,
            assignedById: managerId,
            status: 'ASSIGNED',
          },
        });
      } else {
        // DROP: transfer to whoever picked it up (targetId)
        await tx.shiftAssignment.updateMany({
          where: {
            shiftId: request.shiftId,
            userId: request.requesterId,
            status: { not: 'CANCELLED' },
          },
          data: { status: 'CANCELLED' },
        });

        await tx.shiftAssignment.create({
          data: {
            shiftId: request.shiftId,
            userId: request.targetId,
            assignedById: managerId,
            status: 'ASSIGNED',
          },
        });
      }

      await tx.swapRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED' },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'SwapRequest',
          entityId: request.id,
          action: `${request.type}_APPROVED`,
          actorId: managerId,
          before: { assignedTo: request.requesterId },
          after: { assignedTo: request.targetId },
        },
      });
    });
  }

  private async requireRequest(requestId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: {
        shift: { include: { location: { select: { id: true, name: true } } } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }
}
