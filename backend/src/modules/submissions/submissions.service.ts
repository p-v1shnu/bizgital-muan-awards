import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { createHash } from 'node:crypto';

import { AuditService } from '../audit/audit.service';
import { CreateSubmissionDto, ListSubmissionsDto, ReviewSubmissionDto } from './dto/submission.dto';
import { EditionsService } from '../editions/editions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly editions: EditionsService,
  ) {}

  /**
   * Public entry point. The form is live only while the edition owning this
   * category has submissions switched on and its close date has not passed —
   * both checked here, at request time, so no scheduler is involved.
   */
  async create(dto: CreateSubmissionDto, ip: string | undefined) {
    // A bot filled the hidden field. Answer as if accepted so it learns nothing.
    if (dto.website) return { accepted: true };

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      include: { edition: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (!this.editions.isAcceptingSubmissions(category.edition)) {
      throw new ForbiddenException('Submissions are closed for this edition');
    }

    await this.prisma.publicSubmission.create({
      data: {
        categoryId: dto.categoryId,
        creatorNameRaw: dto.creatorNameRaw.trim(),
        creatorLink: dto.creatorLink,
        reason: dto.reason,
        submitterName: dto.submitterName,
        submitterEmail: dto.submitterEmail,
        ipHash: hashIp(ip),
      },
    });

    // No audit entry: this is a visitor action, and the queue itself is the
    // record. AuditLog rows all belong to a signed-in admin.
    return { accepted: true };
  }

  /**
   * The screening queue. Entries are grouped by name and category so the same
   * creator sent in twenty times reads as one row with a count of twenty
   * (PRD §7.2) — that count is the useful signal, not twenty separate rows.
   */
  async listGrouped(query: ListSubmissionsDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;

    const where: Prisma.PublicSubmissionWhereInput = {
      status: query.status ?? SubmissionStatus.PENDING,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.editionId ? { category: { editionId: query.editionId } } : {}),
      ...(query.q ? { creatorNameRaw: { contains: query.q } } : {}),
    };

    const rows = await this.prisma.publicSubmission.findMany({
      where,
      include: { category: { include: { edition: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Grouping in memory: the queue is small (hundreds, not millions) and a
    // SQL GROUP BY here would lose the per-entry evidence the team reads.
    const groups = new Map<string, GroupedSubmission>();
    for (const row of rows) {
      const key = `${row.categoryId}::${row.creatorNameRaw.trim().toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        existing.entries.push(row);
        if (row.createdAt > existing.latestAt) existing.latestAt = row.createdAt;
      } else {
        groups.set(key, {
          key,
          creatorNameRaw: row.creatorNameRaw.trim(),
          category: row.category,
          count: 1,
          latestAt: row.createdAt,
          entries: [row],
        });
      }
    }

    const all = [...groups.values()].sort((a, b) => b.count - a.count || +b.latestAt - +a.latestAt);
    const slice = all.slice((page - 1) * perPage, page * perPage);
    return paginate(slice, all.length, page, perPage);
  }

  async counts() {
    const grouped = await this.prisma.publicSubmission.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const out: Record<string, number> = { PENDING: 0, ACCEPTED: 0, REJECTED: 0, MERGED: 0 };
    for (const row of grouped) out[row.status] = row._count._all;
    return out;
  }

  /**
   * Accept an entry: attach it to a creator (existing or newly created from
   * the raw name) and nominate them. Every other pending entry naming the
   * same person in the same category is folded in as MERGED, so accepting
   * one clears the whole cluster.
   */
  async accept(id: string, dto: ReviewSubmissionDto, actorId: string, ipAddress?: string) {
    const submission = await this.prisma.publicSubmission.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException('That entry has already been reviewed');
    }

    const creatorId = await this.resolveCreator(submission.creatorNameRaw, dto);

    const result = await this.prisma.$transaction(async (tx) => {
      const existingNomination = await tx.nomination.findUnique({
        where: { categoryId_creatorId: { categoryId: submission.categoryId, creatorId } },
      });

      if (!existingNomination) {
        const last = await tx.nomination.findFirst({
          where: { categoryId: submission.categoryId },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true },
        });
        await tx.nomination.create({
          data: {
            categoryId: submission.categoryId,
            creatorId,
            sortOrder: (last?.sortOrder ?? -1) + 1,
          },
        });
      }

      await tx.publicSubmission.update({
        where: { id },
        data: { status: SubmissionStatus.ACCEPTED, matchedCreatorId: creatorId },
      });

      const merged = await tx.publicSubmission.updateMany({
        where: {
          id: { not: id },
          categoryId: submission.categoryId,
          creatorNameRaw: submission.creatorNameRaw,
          status: SubmissionStatus.PENDING,
        },
        data: { status: SubmissionStatus.MERGED, matchedCreatorId: creatorId },
      });

      return { merged: merged.count, alreadyNominated: Boolean(existingNomination) };
    });

    await this.audit.log({
      userId: actorId,
      action: 'submission.accepted',
      targetType: 'PublicSubmission',
      targetId: id,
      after: {
        creatorId,
        categoryId: submission.categoryId,
        mergedDuplicates: result.merged,
        alreadyNominated: result.alreadyNominated,
      },
      ipAddress,
    });
    return { creatorId, ...result };
  }

  /** Rejecting one entry rejects the whole cluster — the team judged the name, not the row. */
  async reject(id: string, actorId: string, ipAddress?: string) {
    const submission = await this.prisma.publicSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException('That entry has already been reviewed');
    }

    const { count } = await this.prisma.publicSubmission.updateMany({
      where: {
        categoryId: submission.categoryId,
        creatorNameRaw: submission.creatorNameRaw,
        status: SubmissionStatus.PENDING,
      },
      data: { status: SubmissionStatus.REJECTED },
    });

    await this.audit.log({
      userId: actorId,
      action: 'submission.rejected',
      targetType: 'PublicSubmission',
      targetId: id,
      before: { creatorNameRaw: submission.creatorNameRaw, categoryId: submission.categoryId },
      after: { rejected: count },
      ipAddress,
    });
    return { rejected: count };
  }

  private async resolveCreator(rawName: string, dto: ReviewSubmissionDto) {
    if (dto.creatorId) {
      const creator = await this.prisma.creator.findFirst({
        where: { id: dto.creatorId, deletedAt: null },
      });
      if (!creator) throw new NotFoundException('Creator not found');
      return creator.id;
    }

    if (!dto.newCreatorSlug) {
      throw new BadRequestException('Pass creatorId to match an existing creator, or newCreatorSlug to add one');
    }
    const clash = await this.prisma.creator.findUnique({ where: { slug: dto.newCreatorSlug } });
    if (clash) throw new BadRequestException('That slug is already taken');

    const created = await this.prisma.creator.create({
      data: { slug: dto.newCreatorSlug, nameLo: rawName },
    });
    return created.id;
  }
}

type QueueRow = Prisma.PublicSubmissionGetPayload<{
  include: { category: { include: { edition: true } } };
}>;

/** One name in one category, however many times it was sent in. */
export interface GroupedSubmission {
  key: string;
  creatorNameRaw: string;
  category: QueueRow['category'];
  count: number;
  latestAt: Date;
  entries: QueueRow[];
}

/**
 * Stored hashed, never raw (PRD §10). Salted with the JWT secret so the table
 * alone cannot be brute-forced back to addresses — the space of IPv4 is small
 * enough that an unsalted hash is barely a hash at all.
 */
function hashIp(ip: string | undefined) {
  return createHash('sha256')
    .update(`${process.env.JWT_SECRET ?? ''}:${ip ?? 'unknown'}`)
    .digest('hex');
}
