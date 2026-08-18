import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateSponsorTierDto {
  @ApiProperty({ example: 'ລະດັບຄຳ', description: 'The heading the logos sit under' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nameLo!: string;
}

export class UpdateSponsorTierDto extends PartialType(CreateSponsorTierDto) {}

class ReorderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

/** Tiers are shown top to bottom in this order, and so are the logos under them. */
export class ReorderSponsorTiersDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}

export class CopySponsorTiersDto {
  @ApiProperty({ description: 'Edition id to copy the tier list from' })
  @IsString()
  fromEditionId!: string;
}
