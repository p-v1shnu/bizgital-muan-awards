import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Keys into the fixed set of reasons a sender can check on /submit — kept in
 * sync by hand with frontend/src/lib/submission-reason-tags.ts. A validated
 * preset rather than a full Prisma enum, the same way site-settings.dto.ts's
 * JUDGING_STEP_ICON_NAMES is, since the column itself is Json (PublicSubmission
 * has no reasonTags enum column, just an array of these strings).
 */
export const SUBMISSION_REASON_TAGS = [
  'creativity',
  'relevance',
  'quality',
  'consistency',
  'engagement',
] as const;

export class CreateSubmissionDto {
  // Trimmed for the same reason as the name below, so that a whitespace id and
  // an empty one are the one answer rather than a 400 and a 404.
  @ApiProperty({ description: 'Category being nominated into' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  /**
   * Trimmed before it is measured, not after.
   *
   * `MinLength(1)` counted the spaces: a name of three spaces satisfied it,
   * and the service trims before storing — so the row that reached the
   * screening queue held an empty name. The form's `required` does not catch
   * it either (spaces are a value, and the form is `noValidate` besides), and
   * the queue groups by this exact string, so those rows collected into one
   * nameless group the team could neither identify nor act on.
   */
  @ApiProperty({ description: 'Kept verbatim as evidence, exactly as typed' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  creatorNameRaw!: string;

  /**
   * Bounded by the column, which is VARCHAR(191). `IsUrl` alone allows 2,084
   * characters, so a longer link passed validation and was refused by the
   * database instead — a 500 anyone could send without signing in, and ten of
   * those in five minutes is the spike /health/errors wakes somebody up for.
   */
  @ApiPropertyOptional({ description: 'Link to their page, so the team can find them', maxLength: 191 })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(191)
  creatorLink?: string;

  @ApiProperty({
    enum: SUBMISSION_REASON_TAGS,
    isArray: true,
    description: 'Why they should win — at least one, checked from a fixed set',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SUBMISSION_REASON_TAGS.length)
  @ArrayUnique()
  @IsIn(SUBMISSION_REASON_TAGS, { each: true })
  reasonTags!: string[];

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
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may contain lowercase letters, numbers and dashes only' })
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
