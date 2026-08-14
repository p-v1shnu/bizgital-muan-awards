import { Module } from '@nestjs/common';

import { SiteSettingsAdminController, SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  controllers: [SiteSettingsController, SiteSettingsAdminController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
