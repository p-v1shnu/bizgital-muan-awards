import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';

import { StorageService, type UploadFolder } from './storage.service';

const FOLDERS = ['creators', 'judges', 'sponsors', 'editions', 'site'] as const;

export class CreateUploadUrlDto {
  @ApiProperty({ enum: FOLDERS })
  @IsEnum(FOLDERS)
  folder!: UploadFolder;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType!: string;

  @ApiProperty({ example: 482_910 })
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

@ApiTags('storage-admin')
@Controller('admin/uploads')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @ApiOperation({ summary: 'Get a short-lived URL to upload one image directly to storage' })
  create(@Body() dto: CreateUploadUrlDto) {
    return this.storage.createUploadUrl(dto.folder, dto.contentType, dto.sizeBytes);
  }
}
