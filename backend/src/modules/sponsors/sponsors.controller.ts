import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CreateSponsorDto, ReorderSponsorsDto, UpdateSponsorDto } from './dto/sponsor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SponsorsService } from './sponsors.service';

@ApiTags('sponsors-admin')
@Controller('admin/editions/:editionId/sponsors')
export class SponsorsAdminController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  @ApiOperation({ summary: 'Sponsors of one edition, by tier' })
  list(@Param('editionId') editionId: string) {
    return this.sponsors.listByEdition(editionId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a sponsor' })
  create(
    @Param('editionId') editionId: string,
    @Body() dto: CreateSponsorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.sponsors.create(editionId, dto, actor.id, req.ip);
  }

  @Post('reorder')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save a new display order within each tier' })
  reorder(
    @Param('editionId') editionId: string,
    @Body() dto: ReorderSponsorsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.sponsors.reorder(editionId, dto, actor.id, req.ip);
  }
}

@ApiTags('sponsors-admin')
@Controller('admin/sponsors')
export class SponsorActionsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a sponsor' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.sponsors.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a sponsor' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.sponsors.remove(id, actor.id, req.ip);
  }
}
