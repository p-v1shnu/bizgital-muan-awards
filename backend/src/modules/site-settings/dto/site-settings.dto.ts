import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * One question and its answer on /about. A question with no answer behind it is
 * refused here rather than stored: on the page it would be a heading that opens
 * onto nothing, which is worse than the question not being there at all.
 */
export class FaqItemDto {
  @ApiProperty({ example: 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  questionLo!: string;

  @ApiProperty({ description: 'One paragraph per line' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  answerLo!: string;
}

/**
 * One step in "how this is judged". The homepage and /about both render the
 * same list, so a step edited here changes on both — which is the point: they
 * used to hold separate copies and had already drifted apart.
 */
export class JudgingStepDto {
  @ApiProperty({ example: 'ຄັດກອງ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  titleLo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  bodyLo!: string;
}

/**
 * One homepage card's words. Both fields are optional: a blank one falls back to
 * the page's own wording, so the team can reword the states it cares about and
 * leave the rest alone.
 */
export class HomeCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bodyLo?: string;
}

/**
 * The cards under the homepage hero, keyed by what the site can currently say.
 * The keys are fixed because the states are the system's — a year is a draft, or
 * published, or taking entries — and `hallOfWinners` takes only a body, since its
 * heading is the name of the page it leads to and the nav says it too.
 */
export class HomeCardsDto {
  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  noYear?: HomeCardDto;

  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  draft?: HomeCardDto;

  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  published?: HomeCardDto;

  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  nominees?: HomeCardDto;

  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  winners?: HomeCardDto;

  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  entriesOpen?: HomeCardDto;

  @ApiPropertyOptional({ type: HomeCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardDto)
  hallOfWinners?: HomeCardDto;
}

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

  @ApiPropertyOptional({
    type: [FaqItemDto],
    description: 'The whole /about FAQ, in display order. The team writes the questions as well as the answers',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faq?: FaqItemDto[];

  @ApiPropertyOptional({
    type: [JudgingStepDto],
    description: 'How the awards are judged, in order — rendered by the homepage and by /about',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => JudgingStepDto)
  judgingSteps?: JudgingStepDto[];

  @ApiPropertyOptional({ type: HomeCardsDto, description: 'Copy on the two cards under the homepage hero' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeCardsDto)
  homeCards?: HomeCardsDto;

  @ApiPropertyOptional({ description: 'What happens after a name is sent in, listed on /submit — one item per line' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  submitAfterLo?: string | null;
}
