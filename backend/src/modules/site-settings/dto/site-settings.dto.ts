import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Evergreen, site-level content — nothing here may name a year (PRD §6.1.1). */
export class UpdateSiteSettingsDto {
  @ApiPropertyOptional({ description: 'Object storage key, never a full URL' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  heroImageKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroCaptionLo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroCaptionEn?: string | null;

  @ApiPropertyOptional({ description: 'The homepage hero heading — the site\'s own name' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  heroTitleLo?: string;

  @ApiPropertyOptional({ description: 'The one-line statement under the homepage title' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  brandStatementLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  brandStatementEn?: string;

  @ApiPropertyOptional({ description: 'Short about paragraph shown on the homepage' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aboutSummaryLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aboutSummaryEn?: string;

  @ApiPropertyOptional({ type: [String], description: 'Homepage gallery, in display order' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  galleryImageKeys?: string[];
}
