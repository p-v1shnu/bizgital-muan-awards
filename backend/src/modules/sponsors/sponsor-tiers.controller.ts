import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  CopySponsorTiersDto,
  CreateSponsorTierDto,
  ReorderSponsorTiersDto,
  UpdateSponsorTierDto,
} from './dto/sponsor-tier.dto';
import { SponsorTiersService } from './sponsor-tiers.service';

@ApiTags('sponsors-admin')
@Controller('admin/editions/:editionId/sponsor-tiers')
export class SponsorTiersAdminController {
  constructor(private readonly tiers: SponsorTiersService) {}

  @Get()
  @ApiOperation({ summary: 'Sponsor tiers of one edition, in display order' })
  list(@Param('editionId') editionId: string) {
    return this.tiers.listByEdition(editionId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a sponsor tier' })
  create(
    @Param('editionId') editionId: string,
    @Body() dto: CreateSponsorTierDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.create(editionId, dto, actor.id, req.ip);
  }

  @Post('reorder')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save a new tier order' })
  reorder(
    @Param('editionId') editionId: string,
    @Body() dto: ReorderSponsorTiersDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.reorder(editionId, dto, actor.id, req.ip);
  }

  @Post('copy')
  @ApiOperation({ summary: 'Copy the tier list from another edition' })
  copy(
    @Param('editionId') editionId: string,
    @Body() dto: CopySponsorTiersDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.copyFrom(editionId, dto, actor.id, req.ip);
  }
}

/** Edits address a tier by its own id, the same shape sponsors use. */
@ApiTags('sponsors-admin')
@Controller('admin/sponsor-tiers')
export class SponsorTierActionsController {
  constructor(private readonly tiers: SponsorTiersService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a sponsor tier' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorTierDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a tier that holds no sponsors' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.tiers.remove(id, actor.id, req.ip);
  }
}
