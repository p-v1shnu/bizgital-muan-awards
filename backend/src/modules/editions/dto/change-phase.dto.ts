import { ApiProperty } from '@nestjs/swagger';
import { EditionPhase } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangePhaseDto {
  @ApiProperty({ enum: EditionPhase })
  @IsEnum(EditionPhase)
  phase!: EditionPhase;
}
