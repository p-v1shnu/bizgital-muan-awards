import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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

export class CreateCategoryDto {
  @ApiProperty({ example: 'creator-of-the-year' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may contain lowercase letters, numbers and dashes only' })
  @MaxLength(60)
  slug!: string;

  @ApiProperty({ example: 'ຜູ້ສ້າງສັນແຫ່ງປີ' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameLo!: string;

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

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

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
