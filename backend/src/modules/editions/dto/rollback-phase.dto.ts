import { ApiProperty } from '@nestjs/swagger';
import { EditionPhase } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class RollbackPhaseDto {
  @ApiProperty({ enum: EditionPhase, description: 'Must be earlier than the edition\'s current phase' })
  @IsEnum(EditionPhase)
  phase!: EditionPhase;

  @ApiProperty({ description: 'Why — kept in the audit trail alongside the phase change' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
