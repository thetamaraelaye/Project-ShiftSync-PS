import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsString()
  shiftId: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Required when overriding a 7th consecutive day block' })
  @IsOptional()
  @IsString()
  overrideReason?: string;
}

export class BulkAssignDto {
  @ApiProperty({ description: 'Array of userId strings to assign to this shift' })
  userIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overrideReason?: string;
}
