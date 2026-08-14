import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CreatorsService } from './creators.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateCreatorDto, UpdateCreatorDto } from './dto/creator.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creators: CreatorsService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public creator profile with the years they appear in' })
  bySlug(@Param('slug') slug: string) {
    return this.creators.findPublicBySlug(slug);
  }
}

@ApiTags('creators-admin')
@Controller('admin/creators')
export class CreatorsAdminController {
  constructor(private readonly creators: CreatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Search the creator library' })
  list(@Query() query: PaginationDto) {
    return this.creators.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One creator with their nomination history' })
  byId(@Param('id') id: string) {
    return this.creators.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a creator to the library' })
  create(@Body() dto: CreateCreatorDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.creators.create(dto, actor.id, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a creator' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreatorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.creators.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a creator who holds no nominations' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.creators.remove(id, actor.id, req.ip);
  }
}
