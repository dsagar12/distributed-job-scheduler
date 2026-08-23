import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'admin@scheduler.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AdminSecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'System Administrator' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Acme Cloud Platform', required: false })
  @IsString()
  @IsNotEmpty()
  organizationName?: string = 'Default Organization';

  @ApiProperty({ example: 'Production Cluster', required: false })
  @IsString()
  @IsNotEmpty()
  projectName?: string = 'Default Project';
}
