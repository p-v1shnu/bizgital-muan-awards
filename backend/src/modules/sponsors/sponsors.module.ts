import { Module } from '@nestjs/common';

import { SponsorActionsController, SponsorsAdminController } from './sponsors.controller';
import { SponsorTierActionsController, SponsorTiersAdminController } from './sponsor-tiers.controller';
import { SponsorTiersService } from './sponsor-tiers.service';
import { SponsorsService } from './sponsors.service';

@Module({
  controllers: [
    SponsorsAdminController,
    SponsorActionsController,
    SponsorTiersAdminController,
    SponsorTierActionsController,
  ],
  providers: [SponsorsService, SponsorTiersService],
  exports: [SponsorsService, SponsorTiersService],
})
export class SponsorsModule {}
