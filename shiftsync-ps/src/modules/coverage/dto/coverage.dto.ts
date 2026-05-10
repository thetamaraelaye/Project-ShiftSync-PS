import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SwapType } from '@db';

export class CreateSwapRequestDto {
  @ApiProperty({ description: 'The shift the requester wants to swap/drop' })
  @IsString()
  shiftId: string;

  @ApiProperty({ enum: SwapType })
  @IsEnum(SwapType)
  type: SwapType;

  @ApiPropertyOptional({ description: 'For SWAP: the userId to swap with' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RespondToSwapDto {
  @ApiProperty({ description: 'ACCEPTED or REJECTED (by target staff member)' })
  @IsEnum(['ACCEPTED', 'REJECTED'])
  response: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ManagerApprovalDto {
  @ApiProperty({ description: 'APPROVED or REJECTED (by manager)' })
  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PickupShiftDto {
  @ApiProperty({ description: 'The shiftId of the DROP request to pick up' })
  @IsString()
  shiftId: string;
}
