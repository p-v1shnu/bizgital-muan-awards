import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ChangePhaseDto } from './dto/change-phase.dto';
import { CreateEditionDto } from './dto/create-edition.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { EditionsService } from './editions.service';
import { PreviewService } from '../public-site/preview.service';
import { SubmissionsSwitchDto } from './dto/submissions-switch.dto';
import { UpdateEditionDto } from './dto/update-edition.dto';

// The visitor-facing reads live in PublicSiteController, so the order of the
// public routes stays visible in one file.

@ApiTags('editions-admin')
@Controller('admin/editions')
export class EditionsAdminController {
  constructor(
    private readonly editions: EditionsService,
    private readonly preview: PreviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Every edition including drafts' })
  list() {
    return this.editions.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One edition by id, draft or not' })
  byId(@Param('id') id: string) {
    return this.editions.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an edition' })
  create(@Body() dto: CreateEditionDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.editions.create(dto, actor.id, req.ip);
  }

  @Post(':id/preview-token')
  @ApiOperation({ summary: 'Mint a 7-day link that opens this year before it is published' })
  async previewToken(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // Confirms the edition exists (and 404s if not) before minting anything.
    const edition = await this.editions.findById(id);
    const minted = await this.preview.mint(edition.id);
    await this.editions.recordPreviewLink(edition, actor.id, minted.expiresAt, req.ip);
    return { ...minted, slug: edition.slug };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an edition' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEditionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.editions.update(id, dto, actor.id, req.ip);
  }

  @Patch(':id/phase')
  @ApiOperation({ summary: 'Move the edition forward through its phases' })
  changePhase(
    @Param('id') id: string,
    @Body() dto: ChangePhaseDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.editions.changePhase(id, dto, actor.id, req.ip);
  }

  @Patch(':id/submissions')
  @ApiOperation({ summary: 'Open or close the submission form for this edition' })
  setSubmissions(
    @Param('id') id: string,
    @Body() dto: SubmissionsSwitchDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.editions.setSubmissions(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a draft edition' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.editions.remove(id, actor.id, req.ip);
  }
}
