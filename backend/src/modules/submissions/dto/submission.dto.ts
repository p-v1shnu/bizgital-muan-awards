import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'Category being nominated into' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ description: 'Kept verbatim as evidence, exactly as typed' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  creatorNameRaw!: string;

  @ApiPropertyOptional({ description: 'Link to their page, so the team can find them' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  creatorLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Optional — the form never demands personal details (PRD §10)' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  submitterName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  submitterEmail?: string;

  /**
   * Honeypot. Real people never see this field, so anything in it is a bot.
   * Named plausibly on purpose — a field called "honeypot" would be skipped.
   */
  @ApiPropertyOptional({ description: 'Leave empty' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class ReviewSubmissionDto {
  @ApiPropertyOptional({
    description: 'Existing creator to attach this entry to. Omit to create one from the raw name.',
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ description: 'Slug for the new creator, required when creatorId is omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  newCreatorSlug?: string;
}

export class ListSubmissionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SubmissionStatus })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  editionId?: string;
}

export class CountSubmissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  editionId?: string;
}

/**
 * Fold one pending group into another, for the case the automatic grouping
 * cannot see: the same person sent in under two spellings (PRD §7.2).
 */
export class MergeSubmissionDto {
  @ApiProperty({
    description: 'Any entry from the group this one should join. Must be pending, and in the same category.',
  })
  @IsString()
  intoSubmissionId!: string;
}
