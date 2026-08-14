import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
  }
}
