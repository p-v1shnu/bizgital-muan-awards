import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryTemplateDto {
  @ApiProperty({ example: 'creator-of-the-year' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may contain lowercase letters, numbers and dashes only' })
  @MaxLength(60)
  slug!: string;

  @ApiProperty({ example: 'ຜູ້ສ້າງສັນເນື້ອຫາແຫ່ງປີ' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string | null;

  @ApiPropertyOptional({
    description: 'Copied into descriptionLo the moment a category picks this template',
  })
  @IsOptional()
  @IsString()
  descriptionLo?: string | null;
}

export class UpdateCategoryTemplateDto extends PartialType(CreateCategoryTemplateDto) {}
