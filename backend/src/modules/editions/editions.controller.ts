import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ChangePhaseDto } from './dto/change-phase.dto';
import { CreateEditionDto } from './dto/create-edition.dto';
import { EditionsService } from './editions.service';
import { SubmissionsSwitchDto } from './dto/submissions-switch.dto';
import { UpdateEditionDto } from './dto/update-edition.dto';

@ApiTags('editions')
@Controller('editions')
export class EditionsController {
  constructor(private readonly editions: EditionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Every edition the public may see, newest first' })
  list() {
    return this.editions.listPublic();
  }

  @Public()
  @Get('latest')
  @ApiOperation({ summary: 'The newest published edition — what the nav points at' })
  async latest() {
    const edition = await this.editions.findLatestPublished();
    if (!edition) throw new NotFoundException('No published edition yet');
    return edition;
  }

  @Public()
  @Get('latest-winners')
  @ApiOperation({ summary: 'The newest edition that has winners — the homepage strip' })
  async latestWinners() {
    const edition = await this.editions.findLatestWithWinners();
    if (!edition) throw new NotFoundException('No edition has announced winners yet');
    return edition;
  }

  @Public()
  @Get('accepting-submissions')
  @ApiOperation({ summary: 'The edition currently collecting entries, or null' })
  accepting() {
    return this.editions.findAcceptingSubmissions();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'One edition by slug' })
  bySlug(@Param('slug') slug: string) {
    return this.editions.findPublicBySlug(slug);
  }
}

@ApiTags('editions-admin')
@Controller('admin/editions')
export class EditionsAdminController {
  constructor(private readonly editions: EditionsService) {}

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
