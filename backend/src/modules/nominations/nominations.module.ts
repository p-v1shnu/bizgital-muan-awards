import { Module } from '@nestjs/common';

import { NominationActionsController, NominationsAdminController } from './nominations.controller';
import { NominationsService } from './nominations.service';

@Module({
  controllers: [NominationsAdminController, NominationActionsController],
  providers: [NominationsService],
  exports: [NominationsService],
})
export class NominationsModule {}
