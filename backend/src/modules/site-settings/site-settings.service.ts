import { Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';

const SINGLETON = 'singleton';

@Injectable()
export class SiteSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Always returns a row. The homepage renders from this, so a missing record
   * would blank the page rather than merely lose a setting.
   */
  get() {
    return this.prisma.siteSetting.upsert({
      where: { id: SINGLETON },
      update: {},
      create: { id: SINGLETON, brandStatementLo: '', aboutSummaryLo: '' },
    });
  }

  async update(dto: UpdateSiteSettingsDto, actorId: string, ipAddress?: string) {
    const before = await this.get();
    const after = await this.prisma.siteSetting.update({
      where: { id: SINGLETON },
      data: dto,
    });

    await this.audit.log({
      userId: actorId,
      action: 'site.updated',
      targetType: 'SiteSetting',
      targetId: SINGLETON,
      before,
      after,
      ipAddress,
    });
    return after;
  }
}
