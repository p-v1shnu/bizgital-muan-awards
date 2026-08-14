import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RevalidationService } from './revalidation.service';

export interface AuditEntry {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}

/**
 * Append-only record of every state change (PRD §8 rule 6).
 * Application logs go to stdout instead — the two are never mixed.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async log(entry: AuditEntry) {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress,
      },
    });

    // Every content change lands here, which makes this the one place that
    // sees them all — so the site cache is cleared from here rather than from
    // each service, where a new write path would eventually be forgotten.
    this.revalidation.trigger(entry.action);
  }
}
