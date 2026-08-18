import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A sponsor group of one year, named by the team. */
export class CreateSponsorTierDto {
  @ApiProperty({ example: 'ຜູ້ສະໜັບສະໜູນຫຼັກ' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nameLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameEn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateSponsorTierDto extends PartialType(CreateSponsorTierDto) {}

class TierOrderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

/** The order the groups are drawn in on the year page. */
export class ReorderSponsorTiersDto {
  @ApiProperty({ type: [TierOrderItem] })
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => TierOrderItem)
  items!: TierOrderItem[];
}

/**
 * Where to put the logos a group still holds, so that deleting the group cannot
 * take a paying sponsor off the year page by accident.
 */
export class DeleteSponsorTierDto {
  @ApiPropertyOptional({ description: 'Required when the group still holds logos' })
  @IsOptional()
  @IsString()
  moveToTierId?: string;
}
