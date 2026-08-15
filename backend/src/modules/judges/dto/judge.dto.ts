import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { JudgeRole } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateJudgeDto {
  @ApiProperty({ example: 'ທ່ານ ສົມສັກ ພົມມະວົງ' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  nameLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string | null;

  @ApiProperty({ example: 'ຜູ້ອຳນວຍການ, Muan Media' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  positionEn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bioLo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bioEn?: string | null;

  @ApiPropertyOptional({ description: 'Object storage key, never a full URL' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  avatarKey?: string | null;
}

export class UpdateJudgeDto extends PartialType(CreateJudgeDto) {}

export class AssignJudgeDto {
  @ApiProperty()
  @IsString()
  judgeId!: string;

  @ApiPropertyOptional({ enum: JudgeRole, default: JudgeRole.MEMBER })
  @IsOptional()
  @IsEnum(JudgeRole)
  role?: JudgeRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional({ enum: JudgeRole })
  @IsOptional()
  @IsEnum(JudgeRole)
  role?: JudgeRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class ReorderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

/** The order the panel is shown in, under the chair (PRD §6.1.2 §6). */
export class ReorderPanelDto {
  @ApiProperty({ type: [ReorderItem], description: 'Assignment ids, not judge ids' })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}
