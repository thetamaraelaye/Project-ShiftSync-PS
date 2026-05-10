import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto, UpdateShiftDto, PublishWeekDto, WeekScheduleQueryDto } from './dto/shifts.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Shifts')
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Get('week')
  @ApiOperation({ summary: 'Get weekly schedule (filtered by role, location, skill)' })
  getWeekSchedule(
    @Query() query: WeekScheduleQueryDto,
    @CurrentUser('role') role: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shiftsService.getWeekSchedule(query, role, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift detail with assignments and audit history' })
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a shift' })
  create(@Body() dto: CreateShiftDto, @CurrentUser('id') actorId: string) {
    return this.shiftsService.create(dto, actorId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a shift (cancels pending swap requests)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.shiftsService.update(id, dto, actorId, role);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a shift' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.shiftsService.delete(id, actorId, role);
  }

  @Post('publish')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Publish all DRAFT shifts for a location+week' })
  publish(@Body() dto: PublishWeekDto, @CurrentUser('id') actorId: string) {
    return this.shiftsService.publishWeek(dto, actorId);
  }

  @Post('unpublish')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Unpublish a week schedule (within edit cutoff)' })
  unpublish(
    @Body() dto: { weekStart: string; locationId: string; force?: boolean },
    @CurrentUser('id') actorId: string,
  ) {
    return this.shiftsService.unpublishWeek(dto, actorId);
  }
}
