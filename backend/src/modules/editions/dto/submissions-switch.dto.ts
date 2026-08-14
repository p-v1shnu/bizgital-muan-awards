import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

/** The submission form switch, independent of phase (PRD §4.2). */
export class SubmissionsSwitchDto {
  @ApiProperty()
  @IsBoolean()
  submissionsOpen!: boolean;

  @ApiPropertyOptional({
    description: 'Optional auto-close moment. Null keeps the form open until switched off by hand.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  submissionsCloseAt?: string | null;
}
