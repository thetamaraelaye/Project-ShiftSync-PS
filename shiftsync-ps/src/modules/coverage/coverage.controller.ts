import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CoverageService } from './coverage.service';
import { CreateSwapRequestDto, RespondToSwapDto, ManagerApprovalDto } from './dto/coverage.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@common';

@SkipThrottle()
@ApiTags('Coverage')
@Controller('coverage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CoverageController {
  constructor(private coverageService: CoverageService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Create a swap or drop request' })
  createRequest(@Body() dto: CreateSwapRequestDto, @CurrentUser('id') userId: string) {
    return this.coverageService.createRequest(dto, userId);
  }

  @Get('requests/mine')
  @ApiOperation({ summary: 'Get my swap/drop requests (as requester or target)' })
  getMyRequests(@CurrentUser('id') userId: string) {
    return this.coverageService.getMyRequests(userId);
  }

  @Get('requests/open-shifts')
  @ApiOperation({ summary: 'Get open shifts available for pickup (filtered by my qualifications)' })
  getOpenShifts(@CurrentUser('id') userId: string) {
    return this.coverageService.getOpenShifts(userId);
  }

  @Get('requests/pending-approvals')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Get requests awaiting manager approval (Manager: their locations only)',
  })
  getPendingApprovals(
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coverageService.getPendingApprovals(actorId, role);
  }

  @Patch('requests/:id/respond')
  @ApiOperation({ summary: 'Respond to a swap request (target staff: ACCEPTED or REJECTED)' })
  respondToSwap(
    @Param('id') requestId: string,
    @Body() dto: RespondToSwapDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.coverageService.respondToSwap(requestId, dto, userId);
  }

  @Patch('requests/:id/manager-decision')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Manager approves or rejects a coverage request' })
  managerDecision(
    @Param('id') requestId: string,
    @Body() dto: ManagerApprovalDto,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.coverageService.managerDecision(requestId, dto, actorId, role);
  }

  @Post('pickup/:shiftId')
  @ApiOperation({ summary: 'Pick up an open (dropped) shift' })
  pickupShift(@Param('shiftId') shiftId: string, @CurrentUser('id') userId: string) {
    return this.coverageService.pickupShift(shiftId, userId);
  }

  @Patch('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel own pending request' })
  cancelRequest(@Param('id') requestId: string, @CurrentUser('id') userId: string) {
    return this.coverageService.cancelRequest(requestId, userId);
  }
}
