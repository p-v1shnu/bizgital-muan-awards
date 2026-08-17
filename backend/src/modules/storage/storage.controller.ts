import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { memoryStorage } from 'multer';

import { MAX_UPLOAD_BYTES, StorageService, type UploadFolder } from './storage.service';

const FOLDERS = ['creators', 'judges', 'sponsors', 'editions', 'site'] as const;

export class UploadImageDto {
  @ApiProperty({ enum: FOLDERS })
  @IsEnum(FOLDERS)
  folder!: UploadFolder;
}

@ApiTags('storage-admin')
@Controller('admin/uploads')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload one image; the file is written to storage and its key returned' })
  // memoryStorage rather than the disk default: files are small (the ceiling
  // below) and never need to survive past this one request.
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } }))
  create(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadImageDto) {
    if (!file) throw new BadRequestException('No file was sent.');
    return this.storage.uploadFile(file, dto.folder);
  }
}
