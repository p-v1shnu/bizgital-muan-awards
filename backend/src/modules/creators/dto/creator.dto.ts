import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCreatorDto {
  @ApiProperty({ example: 'khamla-sisouvanh' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug may contain lowercase letters, numbers and dashes only' })
  @MaxLength(80)
  slug!: string;

  @ApiProperty({ example: 'ຄຳຫຼ້າ ສີສຸວັນ' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bioLo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bioEn?: string;

  @ApiPropertyOptional({ description: 'Object storage key, never a full URL' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  avatarKey?: string;

  @ApiPropertyOptional({
    example: { facebook: 'https://…', tiktok: 'https://…' },
    description: 'Only facebook, tiktok, youtube and instagram are kept',
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}

export class UpdateCreatorDto extends PartialType(CreateCreatorDto) {}
