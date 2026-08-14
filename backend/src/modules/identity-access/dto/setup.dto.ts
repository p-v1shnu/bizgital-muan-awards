import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Payload for the one-time creation of the first SUPER_ADMIN. */
export class SetupDto {
  @ApiProperty({ example: 'admin@muanawards.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12, description: 'Longer minimum than login: this account cannot be deleted.' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Muan Admin' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}
