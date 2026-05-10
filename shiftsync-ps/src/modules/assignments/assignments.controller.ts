import { Controller, Post, Delete, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/assignments.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign staff to a shift (runs all constraint checks with pessimistic lock)' })
  assign(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.assignmentsService.assign(dto, actorId, role);
  }

  @Post('preview')
  @SkipThrottle()
  @ApiOperation({ summary: 'Preview constraint check for an assignment (no write)' })
  preview(@Body() dto: { shiftId: string; userId: string }) {
    return this.assignmentsService.previewConstraints(dto.shiftId, dto.userId);
  }

  @Delete(':shiftId/users/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove a staff member from a shift' })
  unassign(
    @Param('shiftId') shiftId: string,
    @Param('userId') userId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.assignmentsService.unassign(shiftId, userId, actorId, role);
  }

  @Get('shift/:shiftId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all active assignments for a shift' })
  getShiftAssignments(@Param('shiftId') shiftId: string) {
    return this.assignmentsService.getShiftAssignments(shiftId);
  }
}
