import { Module } from '@nestjs/common';

import { SponsorActionsController, SponsorsAdminController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';

@Module({
  controllers: [SponsorsAdminController, SponsorActionsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
