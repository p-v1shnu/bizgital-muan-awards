import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { EditionsModule } from '../editions/editions.module';

@Module({
  imports: [EditionsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
