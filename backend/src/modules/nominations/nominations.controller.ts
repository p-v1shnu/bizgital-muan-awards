import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AddNominationDto, ReorderNominationsDto, SetWinnerDto } from './dto/nomination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { NominationsService } from './nominations.service';

@ApiTags('nominations-admin')
@Controller('admin/categories/:categoryId/nominations')
export class NominationsAdminController {
  constructor(private readonly nominations: NominationsService) {}

  @Get()
  @ApiOperation({ summary: 'Nominees in a category, winner first' })
  list(@Param('categoryId') categoryId: string) {
    return this.nominations.listByCategory(categoryId);
  }

  @Post()
  @ApiOperation({ summary: 'Nominate a creator from the library' })
  add(
    @Param('categoryId') categoryId: string,
    @Body() dto: AddNominationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.nominations.add(categoryId, dto, actor.id, req.ip);
  }

  @Post('reorder')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save a new display order' })
  reorder(
    @Param('categoryId') categoryId: string,
    @Body() dto: ReorderNominationsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.nominations.reorder(categoryId, dto, actor.id, req.ip);
  }
}

@ApiTags('nominations-admin')
@Controller('admin/nominations')
export class NominationActionsController {
  constructor(private readonly nominations: NominationsService) {}

  @Patch(':id/winner')
  @ApiOperation({ summary: 'Crown or un-crown this nominee (one winner per category)' })
  setWinner(
    @Param('id') id: string,
    @Body() dto: SetWinnerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.nominations.setWinner(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a nominee from their category' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.nominations.remove(id, actor.id, req.ip);
  }
}
