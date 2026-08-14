import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EditionPhase } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEditionDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: '2026', description: 'URL segment under /awards/' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may contain lowercase letters, numbers and dashes only' })
  @MaxLength(40)
  slug!: string;

  @ApiProperty({ example: 'ມ່ວນ ອະວອດ 2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  titleLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  /**
   * Backfilled years are entered at their final phase directly. A new year is
   * left at DRAFT and walked forward later (PRD §4.4).
   */
  @ApiPropertyOptional({ enum: EditionPhase, default: EditionPhase.DRAFT })
  @IsOptional()
  @IsEnum(EditionPhase)
  phase?: EditionPhase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueEn?: string;

  @ApiPropertyOptional({
    description: 'What happens on the night — one item per line (PRD §6.1.2 §5)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  activitiesLo?: string;

  @ApiPropertyOptional({ description: 'Object storage key, never a full URL' })
  @IsOptional()
  @IsString()
  heroImageKey?: string;

  @ApiPropertyOptional({ description: 'External ticketing site; the button hides when unset' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  ticketUrl?: string;

  @ApiPropertyOptional({ description: 'External voting site; the button hides when unset' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  voteUrl?: string;
}
