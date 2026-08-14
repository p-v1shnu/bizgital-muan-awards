import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { EditionsModule } from '../editions/editions.module';
import { PreviewService } from './preview.service';
import { PublicSiteController } from './public-site.controller';
import { PublicSiteService } from './public-site.service';

@Module({
  imports: [forwardRef(() => EditionsModule), JwtModule.register({})],
  controllers: [PublicSiteController],
  providers: [PublicSiteService, PreviewService],
  exports: [PreviewService],
})
export class PublicSiteModule {}
