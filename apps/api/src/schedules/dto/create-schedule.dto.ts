import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ description: 'Project ID or UUID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Queue ID or UUID' })
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @ApiProperty({ example: 'Hourly Sales Aggregation' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '0 * * * *', description: 'Standard 5-part cron expression' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ example: 'UTC', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @ApiProperty({ example: { reportType: 'hourly_sales' } })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ example: '2026-08-23T12:00:00.000Z', description: 'Next run timestamp if one-time future or starting point' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextRunAt?: Date;

  @ApiPropertyOptional({ description: 'Maximum total execution runs before auto-completing' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRuns?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
