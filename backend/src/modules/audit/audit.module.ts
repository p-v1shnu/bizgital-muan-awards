import { Global, Module } from '@nestjs/common';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { RevalidationService } from './revalidation.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, RevalidationService],
  exports: [AuditService, RevalidationService],
})
export class AuditModule {}
