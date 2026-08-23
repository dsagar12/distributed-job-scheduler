import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ description: 'Project ID or UUID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Queue ID or UUID' })
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @ApiProperty({ example: 'Send Verification Email' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: { userId: 'usr_123', email: 'user@example.com', template: 'verify_email' } })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Priority (1-100, higher runs first)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number = 50;

  @ApiPropertyOptional({ example: '2026-08-23T12:00:00.000Z', description: 'Schedule for future execution' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  runAt?: Date;

  @ApiPropertyOptional({ example: 30000, default: 30000, description: 'Execution timeout in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number = 30000;

  @ApiPropertyOptional({ example: 3, default: 3, description: 'Maximum retry attempts' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number = 3;

  @ApiPropertyOptional({ description: 'Retry policy ID override' })
  @IsOptional()
  @IsString()
  retryPolicyId?: string;

  @ApiPropertyOptional({ example: 'idemp-req-unique-998822', description: 'Unique idempotency key' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Parent batch ID if part of a batch' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'Parent job ID if triggered as child task' })
  @IsOptional()
  @IsString()
  parentJobId?: string;
}
