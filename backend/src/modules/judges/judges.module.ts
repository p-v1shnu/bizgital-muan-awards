import { Module } from '@nestjs/common';

import { EditionJudgesController, JudgesAdminController } from './judges.controller';
import { JudgesService } from './judges.service';

@Module({
  controllers: [JudgesAdminController, EditionJudgesController],
  providers: [JudgesService],
  exports: [JudgesService],
})
export class JudgesModule {}
