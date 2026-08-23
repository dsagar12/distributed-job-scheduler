import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryJobsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by Queue ID' })
  @IsOptional()
  @IsString()
  queueId?: string;

  @ApiPropertyOptional({ enum: JobStatus, description: 'Filter by Job Status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Filter by Batch ID' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned worker ID' })
  @IsOptional()
  @IsString()
  workerId?: string;
}
