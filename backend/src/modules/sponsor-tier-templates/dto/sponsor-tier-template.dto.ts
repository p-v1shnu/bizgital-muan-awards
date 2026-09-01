import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSponsorTierTemplateDto {
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
}

export class UpdateSponsorTierTemplateDto extends PartialType(CreateSponsorTierTemplateDto) {}
