import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ScheduledJobStatus } from '@prisma/client';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ enum: ScheduledJobStatus })
  @IsOptional()
  @IsEnum(ScheduledJobStatus)
  status?: ScheduledJobStatus;

  @ApiPropertyOptional({ example: '*/15 * * * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;
}
