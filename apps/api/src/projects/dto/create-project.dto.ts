import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Organization UUID to which the project belongs' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: 'Data Ingestion Service' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'data-ingestion' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase alphanumeric characters and hyphens' })
  slug: string;
}
