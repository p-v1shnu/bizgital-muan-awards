import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CategoryTemplatesService } from './category-templates.service';
import { CreateCategoryTemplateDto, UpdateCategoryTemplateDto } from './dto/category-template.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * The category library — separate from `admin/editions/:id/categories`,
 * which assigns one of these into a year rather than describing the award
 * itself.
 */
@ApiTags('category-templates-admin')
@Controller('admin/category-templates')
export class CategoryTemplatesController {
  constructor(private readonly templates: CategoryTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Search the category library' })
  list(@Query() query: PaginationDto) {
    return this.templates.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Add a category to the library' })
  create(@Body() dto: CreateCategoryTemplateDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.templates.create(dto, actor.id, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a library category — does not touch categories already assigned' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.templates.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a library category that no edition uses' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.templates.remove(id, actor.id, req.ip);
  }
}
