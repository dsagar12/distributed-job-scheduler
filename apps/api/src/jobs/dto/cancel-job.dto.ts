import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelJobDto {
  @ApiPropertyOptional({ example: 'Manually cancelled via dashboard', default: 'User requested cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}
