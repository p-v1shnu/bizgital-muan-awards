import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { JudgeRole } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
  nameEn?: string;

  @ApiProperty({ example: 'ຜູ້ອຳນວຍການ, Muan Media' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionLo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  positionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bioLo?: string;

  @ApiPropertyOptional({ description: 'Object storage key, never a full URL' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  avatarKey?: string;
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
