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
 * keeps the slug and name from drifting one year to the next.
 */
export class CreateCategoryDto {
  @ApiProperty({ description: 'Category template id from the library' })
  @IsString()
  templateId!: string;

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

/**
 * Edits this edition's own copy of the name — a deliberate one-off fix, not
 * the repeated retyping CreateCategoryDto avoids, so it is allowed straight
 * through without going back to the library.
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
