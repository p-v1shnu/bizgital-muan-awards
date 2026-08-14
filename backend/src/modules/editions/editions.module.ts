import { Module } from '@nestjs/common';

import { EditionsAdminController, EditionsController } from './editions.controller';
import { EditionsService } from './editions.service';

@Module({
  controllers: [EditionsController, EditionsAdminController],
  providers: [EditionsService],
  exports: [EditionsService],
})
export class EditionsModule {}
