import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard stats (role-filtered)' })
  getDashboardStats(@CurrentUser('role') role: string, @CurrentUser('id') userId: string) {
    return this.analyticsService.getDashboardStats(role, userId);
  }

  @Get('on-duty')
  @ApiOperation({ summary: 'Staff currently on duty (live)' })
  getOnDutyNow(@CurrentUser('role') role: string, @CurrentUser('id') userId: string) {
    return this.analyticsService.getOnDutyNow(role, userId);
  }

  @Get('overtime')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Overtime risk analytics for a week' })
  getOvertimeAnalytics(
    @CurrentUser('role') role: string,
    @CurrentUser('id') userId: string,
    @Query('locationId') locationId?: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.analyticsService.getOvertimeAnalytics(role, userId, { locationId, weekStart });
  }

  @Get('fairness')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Premium shift fairness distribution' })
  getFairnessAnalytics(
    @CurrentUser('role') role: string,
    @CurrentUser('id') userId: string,
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getFairnessAnalytics(role, userId, {
      locationId,
      startDate,
      endDate,
    });
  }
}
