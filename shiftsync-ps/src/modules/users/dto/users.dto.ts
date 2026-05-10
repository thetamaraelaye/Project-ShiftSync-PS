import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Skill, UserStatus } from '@db';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  desiredWeeklyHours?: number;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class SetSkillsDto {
  @ApiProperty({ enum: Skill, isArray: true })
  @IsArray()
  @IsEnum(Skill, { each: true })
  skills: Skill[];
}

export class SetAvailabilityDto {
  @ApiProperty({
    description: 'Array of weekly recurring availability windows',
    example: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  })
  @IsArray()
  availability: AvailabilityWindowDto[];
}

export class AvailabilityWindowDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=Sun, 1=Mon ... 6=Sat' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM' })
  endTime: string;
}

export class CreateAvailabilityExceptionDto {
  @ApiProperty({ description: 'ISO date string e.g. 2024-12-25' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isUnavailable?: boolean;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
