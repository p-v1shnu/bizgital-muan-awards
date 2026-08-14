import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CategoriesService } from './categories.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  CopyCategoriesDto,
  CreateCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@ApiTags('categories-admin')
@Controller('admin/editions/:editionId/categories')
export class CategoriesAdminController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Categories of one edition, in display order' })
  list(@Param('editionId') editionId: string) {
    return this.categories.listByEdition(editionId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a category' })
  create(
    @Param('editionId') editionId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.categories.create(editionId, dto, actor.id, req.ip);
  }

  @Post('reorder')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save a new display order' })
  reorder(
    @Param('editionId') editionId: string,
    @Body() dto: ReorderCategoriesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.categories.reorder(editionId, dto, actor.id, req.ip);
  }

  @Post('copy')
  @ApiOperation({ summary: 'Copy the category list from another edition' })
  copy(
    @Param('editionId') editionId: string,
    @Body() dto: CopyCategoriesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.categories.copyFrom(editionId, dto, actor.id, req.ip);
  }

}

/**
 * Edits address a category by its own id, the same shape nominations and
 * sponsors use — the caller does not have to know which edition owns it.
 */
@ApiTags('categories-admin')
@Controller('admin/categories')
export class CategoryActionsController {
  constructor(private readonly categories: CategoriesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'One category' })
  byId(@Param('id') id: string) {
    return this.categories.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a category' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.categories.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a category that holds no nominees' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.categories.remove(id, actor.id, req.ip);
  }
}
