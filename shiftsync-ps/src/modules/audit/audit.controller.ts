import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit logs with filters (Admin/Manager) — all filters optional' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Shift | ShiftAssignment | SwapRequest | User | Location' })
  @ApiQuery({ name: 'entityId', required: false, description: 'ID of the specific entity' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter logs related to a location' })
  @ApiQuery({ name: 'actorId', required: false, description: 'Filter by the user who performed the action' })
  @ApiQuery({ name: 'actorRole', required: false, description: 'Filter by actor role: ADMIN | MANAGER | STAFF' })
  @ApiQuery({ name: 'action', required: false, description: 'e.g. SHIFT_CREATED, STAFF_ASSIGNED, SCHEDULE_PUBLISHED' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string (inclusive)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string (inclusive)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (default 50, max 200)' })
  getLogs(
    @CurrentUser('role') role: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('locationId') locationId?: string,
    @Query('actorId') actorId?: string,
    @Query('actorRole') actorRole?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLogs(role, {
      entityType,
      entityId,
      locationId,
      actorId,
      actorRole,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('shift/:shiftId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get full history of a specific shift' })
  getShiftHistory(@Param('shiftId') shiftId: string) {
    return this.auditService.getShiftHistory(shiftId);
  }
}
