import { Module } from '@nestjs/common';

import { SponsorTierTemplatesController } from './sponsor-tier-templates.controller';
import { SponsorTierTemplatesService } from './sponsor-tier-templates.service';

@Module({
  controllers: [SponsorTierTemplatesController],
  providers: [SponsorTierTemplatesService],
  exports: [SponsorTierTemplatesService],
})
export class SponsorTierTemplatesModule {}
