import { Module, forwardRef } from '@nestjs/common';

import { EditionsAdminController } from './editions.controller';
import { EditionsService } from './editions.service';
import { PublicSiteModule } from '../public-site/public-site.module';

@Module({
  // PublicSiteModule needs EditionsService for the "latest" queries, and this
  // module needs PreviewService to mint links — hence the forward reference.
  imports: [forwardRef(() => PublicSiteModule)],
  controllers: [EditionsAdminController],
  providers: [EditionsService],
  exports: [EditionsService],
})
export class EditionsModule {}
