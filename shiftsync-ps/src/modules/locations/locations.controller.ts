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
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, AssignUserToLocationDto } from './dto/locations.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List locations (filtered by role)' })
  findAll(@CurrentUser('role') role: string, @CurrentUser('id') userId: string) {
    return this.locationsService.findAll(role, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location details with staff list' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.locationsService.findOne(id, role, userId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create location (Admin only)' })
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update location (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Post(':id/assign')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign user to location (Admin only)' })
  assignUser(@Param('id') locationId: string, @Body() dto: AssignUserToLocationDto) {
    return this.locationsService.assignUser(locationId, dto);
  }

  @Delete(':id/users/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove user from location (Admin only)' })
  removeUser(
    @Param('id') locationId: string,
    @Param('userId') userId: string,
    @Query('type') type: string,
  ) {
    return this.locationsService.removeUser(locationId, userId, type);
  }

  @Get(':id/staff')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all staff at a location' })
  getStaff(@Param('id') locationId: string) {
    return this.locationsService.getStaff(locationId);
  }
}
