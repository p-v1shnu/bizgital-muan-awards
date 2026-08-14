import { Module } from '@nestjs/common';

import { EditionsModule } from '../editions/editions.module';
import { SubmissionsAdminController, SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  // The form's open/closed test lives in EditionsService, so it is reused
  // rather than duplicated here.
  imports: [EditionsModule],
  controllers: [SubmissionsController, SubmissionsAdminController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
