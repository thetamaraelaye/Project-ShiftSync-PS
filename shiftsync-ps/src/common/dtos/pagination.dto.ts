import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({
    description: 'Number of Space(s) per page',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @ApiPropertyOptional({
    description: 'Filter field and value in format "field:value,field:value,..."',
    example: 'field:value',
  })
  @IsOptional()
  @IsString()
  filters?: string;

  @ApiPropertyOptional({
    description: 'Search query',
    example: 'Search by name, description, location & address',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt:ASC | createdAt:DESC',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO format)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO format)',
    example: '2025-04-30T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  before?: string;
}
