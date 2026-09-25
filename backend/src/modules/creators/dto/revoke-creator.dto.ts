import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RevokeCreatorDto {
  @ApiProperty({
    description:
      'Why — kept in the audit trail, and shown to admins wherever this creator still appears as a nominee or winner',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
