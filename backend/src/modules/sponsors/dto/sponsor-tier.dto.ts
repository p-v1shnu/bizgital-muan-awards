import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

/** Assigns a library sponsor tier (sponsor-tier-templates.dto.ts) into this edition. */
export class AssignSponsorTierDto {
  @ApiProperty({ description: 'Sponsor tier template id from the library' })
  @IsString()
  templateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

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
