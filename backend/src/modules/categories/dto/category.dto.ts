import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Assigns a library category (category-templates.dto.ts) into this edition —
 * picked or freshly created there first, never typed here, which is what
 * keeps the slug, name and description from drifting one year to the next.
 * Only the edition-specific bits are asked for here.
 */
export class CreateCategoryDto {
  @ApiProperty({ description: 'Category template id from the library' })
  @IsString()
  templateId!: string;

  @ApiPropertyOptional({ description: 'Grouping heading, used when a year runs long (PRD §7.6)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  groupLo?: string | null;

  @ApiPropertyOptional({ description: 'Recommended 3-6 per edition' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

/**
 * Only a category with no template of its own may set nameLo/nameEn/slug/
 * descriptionLo/descriptionEn here — CategoriesService.update() refuses
 * them otherwise, since a templated category's identity now lives in the
 * library and is kept in sync from there. groupLo/isFeatured stay allowed
 * either way: those are always per-edition, template or not.
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may contain lowercase letters, numbers and dashes only' })
  @MaxLength(60)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionLo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string | null;

  @ApiPropertyOptional({ description: 'Grouping heading, used when a year runs long (PRD §7.6)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  groupLo?: string | null;

  @ApiPropertyOptional({ description: 'Recommended 3-6 per edition' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

class ReorderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}

export class CopyCategoriesDto {
  @ApiProperty({ description: 'Edition id to copy the category list from' })
  @IsString()
  fromEditionId!: string;
}
