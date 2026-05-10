import {
  IsString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Skill } from '@db';

export class CreateShiftDto {
  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiProperty({ description: 'UTC ISO datetime e.g. 2024-08-15T18:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'UTC ISO datetime — can be next day for overnight shifts' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ enum: Skill })
  @IsEnum(Skill)
  requiredSkill: Skill;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  headcount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ enum: Skill })
  @IsOptional()
  @IsEnum(Skill)
  requiredSkill?: Skill;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  headcount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PublishWeekDto {
  @ApiProperty({ description: 'The Monday of the week to publish e.g. 2024-08-12' })
  @IsDateString()
  weekStart: string;

  @ApiProperty()
  @IsString()
  locationId: string;
}

export class UnpublishWeekDto {
  @ApiProperty({ description: 'The Monday of the week to unpublish' })
  @IsDateString()
  weekStart: string;

  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class WeekScheduleQueryDto {
  @ApiProperty({ description: 'Monday of the week e.g. 2024-08-12' })
  weekStart: string;

  @ApiPropertyOptional()
  locationId?: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional({ enum: Skill })
  skill?: Skill;
}
