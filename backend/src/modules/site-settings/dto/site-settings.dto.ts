import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Heading of the homepage "what this is" section' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  aboutTitleLo?: string;

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

  @ApiPropertyOptional({ description: 'Heading of the homepage closing call-to-action' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaTitleLo?: string;

  @ApiPropertyOptional({ description: 'Body text of the homepage closing call-to-action' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaBodyLo?: string;

  @ApiPropertyOptional({ type: [String], description: 'Homepage gallery, in display order' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  galleryImageKeys?: string[];

  @ApiPropertyOptional({
    example: { facebook: 'https://…', tiktok: 'https://…' },
    description: 'The organisation\'s own accounts, shown in the footer. Only facebook, tiktok, youtube and instagram are kept',
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({ description: 'The "where this came from" paragraphs on /about, one per line' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  aboutHistoryLo?: string | null;

  @ApiPropertyOptional({ description: 'Team address for the contact box on /about' })
  @IsOptional()
  @IsEmail({}, { message: 'contactEmail must be an email address' })
  @MaxLength(200)
  contactEmail?: string | null;

  @ApiPropertyOptional({
    example: '020 5555 5555',
    description: 'Team phone for the contact box on /about. Free text — more than one number is allowed, in which case the page shows it without making it dialable',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contactPhone?: string | null;
}
