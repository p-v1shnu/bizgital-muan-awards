import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';

@ApiTags('site')
@Controller('site')
export class SiteSettingsController {
  constructor(private readonly site: SiteSettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Evergreen homepage content' })
  get() {
    return this.site.get();
  }
}

@ApiTags('site-admin')
@Controller('admin/site')
export class SiteSettingsAdminController {
  constructor(private readonly site: SiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Evergreen homepage content, for editing' })
  get() {
    return this.site.get();
  }

  @Put()
  @ApiOperation({ summary: 'Save evergreen homepage content' })
  update(
    @Body() dto: UpdateSiteSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.site.update(dto, actor.id, req.ip);
  }
}
