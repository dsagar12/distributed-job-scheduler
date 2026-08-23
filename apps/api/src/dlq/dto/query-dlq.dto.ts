import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryDlqDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Queue ID' })
  @IsOptional()
  @IsString()
  queueId?: string;

  @ApiPropertyOptional({ description: 'Filter by Project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;
}
