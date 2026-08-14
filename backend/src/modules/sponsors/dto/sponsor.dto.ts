import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SponsorTier } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateSponsorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ description: 'Object storage key, never a full URL' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  logoKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string;

  @ApiPropertyOptional({ enum: SponsorTier, default: SponsorTier.SUPPORTER })
  @IsOptional()
  @IsEnum(SponsorTier)
  tier?: SponsorTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateSponsorDto extends PartialType(CreateSponsorDto) {}

class ReorderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

/** Sponsors are shown by tier, then by this order inside the tier. */
export class ReorderSponsorsDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}
