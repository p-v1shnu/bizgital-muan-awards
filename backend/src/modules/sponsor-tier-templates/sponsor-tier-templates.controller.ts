import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CreateSponsorTierTemplateDto, UpdateSponsorTierTemplateDto } from './dto/sponsor-tier-template.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SponsorTierTemplatesService } from './sponsor-tier-templates.service';

/**
 * The sponsor-tier library — separate from
 * `admin/editions/:id/sponsor-tiers`, which assigns one of these into a
 * year rather than describing the tier itself.
 */
@ApiTags('sponsor-tier-templates-admin')
@Controller('admin/sponsor-tier-templates')
export class SponsorTierTemplatesController {
  constructor(private readonly templates: SponsorTierTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Search the sponsor-tier library' })
  list(@Query() query: PaginationDto) {
    return this.templates.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Add a sponsor tier to the library' })
  create(
    @Body() dto: CreateSponsorTierTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.templates.create(dto, actor.id, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a library tier — reaches every edition it is assigned to' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorTierTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.templates.update(id, dto, actor.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a library tier no edition uses' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.templates.remove(id, actor.id, req.ip);
  }
}
