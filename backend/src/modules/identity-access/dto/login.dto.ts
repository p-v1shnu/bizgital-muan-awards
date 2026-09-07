import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@muanawards.com' })
  @IsEmail()
  email!: string;

  /**
   * The same ceiling every other password field carries. Nothing this long is
   * a real password, and without a bound the only thing deciding how much work
   * an unauthenticated request can ask of bcrypt is the body parser.
   */
  @ApiProperty({ example: 'a-long-enough-password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
