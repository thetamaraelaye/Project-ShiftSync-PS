import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  SetSkillsDto,
  SetAvailabilityDto,
  CreateAvailabilityExceptionDto,
} from './dto/users.dto';
import { JwtAuthGuard, RolesGuard, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (filtered by role and optional locationId/decertified)' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter staff certified at this location' })
  @ApiQuery({ name: 'decertified', required: false, description: 'If true + locationId: return staff who WERE certified at this location but no longer are (historical data preserved)' })
  findAll(
    @CurrentUser('role') role: string,
    @CurrentUser('id') userId: string,
    @Query('locationId') locationId?: string,
    @Query('decertified') decertified?: string,
  ) {
    return this.usersService.findAll(role, userId, locationId, decertified === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details with availability and skills' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.findOne(id, requesterId, role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Admin/Manager: any user, Staff: self only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.update(id, dto, requesterId, role);
  }

  @Post(':id/skills')
  @ApiOperation({ summary: 'Set user skills (replace all)' })
  setSkills(
    @Param('id') userId: string,
    @Body() dto: SetSkillsDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.setSkills(userId, dto, requesterId, role);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get user recurring availability and exceptions' })
  getAvailability(@Param('id') userId: string) {
    return this.usersService.getAvailability(userId);
  }

  @Post(':id/availability')
  @ApiOperation({ summary: 'Set recurring weekly availability (replaces all)' })
  setAvailability(
    @Param('id') userId: string,
    @Body() dto: SetAvailabilityDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.setAvailability(userId, dto, requesterId, role);
  }

  @Post(':id/availability/exceptions')
  @ApiOperation({ summary: 'Add availability exception for a specific date' })
  createException(
    @Param('id') userId: string,
    @Body() dto: CreateAvailabilityExceptionDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.createAvailabilityException(userId, dto, requesterId, role);
  }

  @Delete(':id/availability/exceptions/:exceptionId')
  @ApiOperation({ summary: 'Remove an availability exception' })
  deleteException(
    @Param('id') userId: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.deleteAvailabilityException(userId, exceptionId, requesterId, role);
  }
}
