import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateQueueDto {
  @ApiProperty({ description: 'Project ID or UUID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'email-notifications' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Transactional email queue' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number = 50;

  @ApiPropertyOptional({ example: 10, description: 'Max concurrent jobs running in this queue' })
  @IsOptional()
  @IsInt()
  @Min(1)
  concurrencyLimit?: number;

  @ApiPropertyOptional({ example: 100, description: 'Max jobs per second' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerSecond?: number;

  @ApiPropertyOptional({ example: 30000, default: 30000, description: 'Default timeout in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  defaultTimeoutMs?: number = 30000;

  @ApiPropertyOptional({ description: 'Retry policy UUID to associate with this queue' })
  @IsOptional()
  @IsUUID()
  retryPolicyId?: string;
}
