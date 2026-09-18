import { SponsorLogoSize } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ enum: SponsorLogoSize, default: SponsorLogoSize.M })
  @IsOptional()
  @IsEnum(SponsorLogoSize)
  logoSize?: SponsorLogoSize;
}

export class UpdateSponsorTierTemplateDto extends PartialType(CreateSponsorTierTemplateDto) {}
