import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class BatchJobItemDto {
  @ApiProperty({ description: 'Queue ID or UUID' })
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @ApiProperty({ example: 'Process CSV Chunk #1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: { chunkIndex: 1, s3Key: 'uploads/chunk-1.csv' } })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number = 50;

  @ApiPropertyOptional({ default: 30000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number = 30000;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number = 3;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  retryPolicyId?: string;
}

export class CreateBatchDto {
  @ApiProperty({ description: 'Project ID or UUID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Nightly Ingestion Batch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [BatchJobItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchJobItemDto)
  jobs: BatchJobItemDto[];
}
