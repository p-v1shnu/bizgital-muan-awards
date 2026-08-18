import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CreateSponsorDto, ReorderSponsorsDto, UpdateSponsorDto } from './dto/sponsor.dto';
import {
  CreateSponsorTierDto,
  DeleteSponsorTierDto,
  ReorderSponsorTiersDto,
  UpdateSponsorTierDto,
} from './dto/sponsor-tier.dto';
import { SponsorTiersService } from './sponsor-tiers.service';
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

@ApiTags('sponsors-admin')
@Controller('admin/editions/:editionId/sponsor-tiers')
export class SponsorTiersAdminController {
  constructor(private readonly tiers: SponsorTiersService) {}

  @Get()
  @ApiOperation({ summary: 'Sponsor groups of one edition, in display order' })
  list(@Param('editionId') editionId: string) {
    return this.tiers.listByEdition(editionId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a sponsor group' })
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
  @ApiOperation({ summary: 'Save the order the groups are drawn in' })
  reorder(
    @Param('editionId') editionId: string,
    @Body() dto: ReorderSponsorTiersDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.reorder(editionId, dto, actor.id, req.ip);
  }

  @Post('copy-from-previous')
  @HttpCode(200)
  @ApiOperation({ summary: "Copy last year's groups, logos included" })
  copy(
    @Param('editionId') editionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.copyFromPrevious(editionId, actor.id, req.ip);
  }
}

@ApiTags('sponsors-admin')
@Controller('admin/sponsor-tiers')
export class SponsorTierActionsController {
  constructor(private readonly tiers: SponsorTiersService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a sponsor group' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorTierDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.update(id, dto, actor.id, req.ip);
  }

  /**
   * Where the logos go is a query parameter rather than a body: the back office's
   * fetch layer sends no body on a DELETE, and a rule the client cannot express
   * is a rule that is not enforced.
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a sponsor group, moving any logos it holds' })
  remove(
    @Param('id') id: string,
    @Query() dto: DeleteSponsorTierDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tiers.remove(id, dto, actor.id, req.ip);
  }
}
