import { Module } from '@nestjs/common';

import { CreatorsAdminController } from './creators.controller';
import { CreatorsService } from './creators.service';

@Module({
  controllers: [CreatorsAdminController],
  providers: [CreatorsService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
