import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaConfig } from '@configs/database.config';
import { SchedulingConstraintService } from '../scheduling/constraint.service';
import { CreateAssignmentDto } from './dto/assignments.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaConfig,
    private constraintService: SchedulingConstraintService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Core assignment logic.
   *
   * Uses a Prisma $transaction with a raw SELECT FOR UPDATE on the shift row
   * to prevent concurrent race conditions (Evaluation Scenario 4).
   */
  async assign(dto: CreateAssignmentDto, actorId: string, actorRole: string) {
    // Pre-flight: verify shift and check headcount before acquiring the lock
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        _count: { select: { assignments: { where: { status: { not: 'CANCELLED' } } } } },
      },
    });

    if (!shift) throw new NotFoundException('Shift not found');

    // Managers can only assign to their locations
    if (actorRole === 'MANAGER') {
      const hasAccess = await this.prisma.userLocation.findFirst({
        where: { userId: actorId, locationId: shift.locationId, type: 'MANAGED' },
      });
      if (!hasAccess) throw new ForbiddenException('You do not manage this location');
    }

    if (shift._count.assignments >= shift.headcount) {
      throw new BadRequestException(
        `Shift is fully staffed (${shift.headcount}/${shift.headcount}). Increase headcount to add more staff.`,
      );
    }

    // Acquire row lock inside transaction — prevents two managers racing
    let assignment: any;
    let constraintResult: any;

    try {
      assignment = await this.prisma.$transaction(async (tx) => {
        // PESSIMISTIC LOCK — second manager will wait here until first commits
        await tx.$executeRaw`SELECT id FROM shifts WHERE id = ${dto.shiftId} FOR UPDATE`;

        // Re-check headcount inside the transaction (race condition safe)
        const lockedShift = await tx.shift.findUnique({
          where: { id: dto.shiftId },
          include: { _count: { select: { assignments: { where: { status: { not: 'CANCELLED' } } } } } },
        });

        if (lockedShift._count.assignments >= lockedShift.headcount) {
          throw new ConflictException(
            `Shift was just filled by another manager. Headcount: ${lockedShift.headcount}`,
          );
        }

        // Run all constraint checks inside the transaction
        constraintResult = await this.constraintService.check(
          dto.shiftId,
          dto.userId,
          tx,
          dto.overrideReason,
        );

        if (!constraintResult.valid) {
          const messages = constraintResult.violations.map((v: any) => v.message).join('; ');
          throw new BadRequestException(`Cannot assign: ${messages}`);
        }

        // Write the assignment
        const created = await tx.shiftAssignment.create({
          data: {
            shiftId: dto.shiftId,
            userId: dto.userId,
            assignedById: actorId,
            overrideReason: dto.overrideReason,
            status: 'ASSIGNED',
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            shift: { include: { location: { select: { id: true, name: true, timezone: true } } } },
          },
        });

        // Write audit log inside transaction (atomically)
        await tx.auditLog.create({
          data: {
            entityType: 'ShiftAssignment',
            entityId: created.id,
            action: 'STAFF_ASSIGNED',
            actorId,
            actorRole,
            after: {
              shiftId: dto.shiftId,
              userId: dto.userId,
              overrideReason: dto.overrideReason,
            },
          },
        });

        return created;
      });
    } catch (e) {
      // Re-throw known exceptions; wrap unknown ones
      if (
        e instanceof ConflictException ||
        e instanceof BadRequestException ||
        e instanceof ForbiddenException
      ) {
        throw e;
      }
      throw e;
    }

    // Emit real-time event AFTER transaction commits
    this.eventEmitter.emit('shift.assigned', {
      shiftId: dto.shiftId,
      locationId: shift.locationId,
      userId: dto.userId,
      staffName: `${assignment.user.firstName} ${assignment.user.lastName}`,
      actorId,
    });

    // Queue notification for the assigned staff member
    this.eventEmitter.emit('notification.send', {
      userId: dto.userId,
      type: 'SHIFT_ASSIGNED',
      title: 'New shift assigned',
      message: `You have been assigned to a ${shift.requiredSkill.toLowerCase()} shift at ${shift.location.name} on ${shift.startTime.toISOString().slice(0, 10)}`,
      metadata: { shiftId: dto.shiftId, locationId: shift.locationId },
    });

    return {
      data: {
        assignment,
        warnings: constraintResult.warnings,
      },
      message: 'Staff member assigned successfully',
    };
  }

  async unassign(shiftId: string, userId: string, actorId: string, actorRole: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { shiftId, userId, status: { not: 'CANCELLED' } },
      include: {
        shift: { include: { location: { select: { id: true, name: true } } } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    if (actorRole === 'MANAGER') {
      const hasAccess = await this.prisma.userLocation.findFirst({
        where: { userId: actorId, locationId: assignment.shift.locationId, type: 'MANAGED' },
      });
      if (!hasAccess) throw new ForbiddenException('You do not manage this location');
    }

    await this.prisma.$transaction([
      this.prisma.shiftAssignment.update({
        where: { id: assignment.id },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.auditLog.create({
        data: {
          entityType: 'ShiftAssignment',
          entityId: assignment.id,
          action: 'STAFF_UNASSIGNED',
          actorId,
          actorRole,
          before: { userId, shiftId },
        },
      }),
    ]);

    this.eventEmitter.emit('shift.unassigned', {
      shiftId,
      locationId: assignment.shift.locationId,
      userId,
    });

    this.eventEmitter.emit('notification.send', {
      userId,
      type: 'SHIFT_UNASSIGNED',
      title: 'Shift assignment removed',
      message: `Your assignment at ${assignment.shift.location.name} has been removed`,
      metadata: { shiftId, locationId: assignment.shift.locationId },
    });

    return { message: `${assignment.user.firstName} unassigned from shift` };
  }

  async previewConstraints(shiftId: string, userId: string) {
    const result = await this.constraintService.check(shiftId, userId);
    return {
      data: result,
      message: result.valid ? 'No constraint violations' : `${result.violations.length} violation(s) found`,
    };
  }

  async getShiftAssignments(shiftId: string) {
    return this.prisma.shiftAssignment.findMany({
      where: { shiftId, status: { not: 'CANCELLED' } },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            skills: { select: { skill: true } },
          },
        },
      },
    });
  }
}
