import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@scheduler.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AdminSecurePass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
