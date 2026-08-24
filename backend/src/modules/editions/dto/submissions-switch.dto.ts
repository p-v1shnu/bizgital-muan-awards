import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

/**
 * The submission form switch. Its own timing (PRD §4.2), but not independent
 * of phase any more: it may only be turned on for a PUBLISHED edition — never
 * a draft nobody can see yet, and never one whose nominees are already
 * announced.
 */
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
