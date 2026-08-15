import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { createHash } from 'node:crypto';

import { AuditService } from '../audit/audit.service';
import { CreateSubmissionDto, ListSubmissionsDto, ReviewSubmissionDto } from './dto/submission.dto';
import { EditionsService } from '../editions/editions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';

/** How many of a group's entries travel with the queue page. */
const ENTRIES_PER_GROUP = 20;

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

    const creatorNameRaw = dto.creatorNameRaw.trim();
    const ipHash = hashIp(ip);

    /**
     * The same name, in the same category, from the same address, on the same
     * day counts once (PRD §7.1). The queue's send count is what the team
     * reads as interest in a creator — if one person pressing the button
     * twenty times showed as twenty, that number would be describing their
     * persistence rather than the creator's support.
     */
    const alreadyToday = await this.prisma.publicSubmission.findFirst({
      where: {
        categoryId: dto.categoryId,
        creatorNameRaw,
        ipHash,
        createdAt: { gte: startOfDayInVientiane() },
      },
      select: { id: true },
    });
    // Answered the same way as a fresh entry: the sender did nothing wrong and
    // has no reason to be told their second try was ignored.
    if (alreadyToday) return { accepted: true };

    try {
      await this.prisma.publicSubmission.create({
        data: {
          categoryId: dto.categoryId,
          creatorNameRaw,
          creatorLink: dto.creatorLink,
          reason: dto.reason,
          submitterName: dto.submitterName,
          submitterEmail: dto.submitterEmail,
          ipHash,
          dedupeKey: dedupeKey(dto.categoryId, creatorNameRaw, ipHash),
        },
      });
    } catch (caught) {
      // The check above loses to a double submission that arrives in the same
      // instant — twice from one impatient tap, or a retry on a flaky phone
      // connection. The unique key catches what the read could not see yet.
      if (
        caught instanceof Prisma.PrismaClientKnownRequestError &&
        caught.code === 'P2002'
      ) {
        return { accepted: true };
      }
      throw caught;
    }

    // No audit entry: this is a visitor action, and the queue itself is the
    // record. AuditLog rows all belong to a signed-in admin.
    return { accepted: true };
  }

  /**
   * The screening queue. Entries are grouped by name and category so the same
   * creator sent in twenty times reads as one row with a count of twenty
   * (PRD §7.2) — that count is the useful signal, not twenty separate rows.
   */
  /**
   * The screening queue, one row per (name, category) with how many times it
   * was sent (PRD §7.2).
   *
   * The grouping used to happen in memory over every entry of that status —
   * fine at the few hundred it was written for, and 700ms per page view at ten
   * thousand, which a campaign that goes well produces. The database groups it
   * now, and only the entries belonging to the page being looked at are read.
   */
  async listGrouped(query: ListSubmissionsDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    const status = query.status ?? SubmissionStatus.PENDING;

    const where: Prisma.PublicSubmissionWhereInput = {
      status,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.editionId ? { category: { editionId: query.editionId } } : {}),
      ...(query.q ? { creatorNameRaw: { contains: query.q } } : {}),
    };

    const [pageGroups, totalGroups] = await Promise.all([
      this.prisma.publicSubmission.groupBy({
        by: ['categoryId', 'creatorNameRaw'],
        where,
        _count: { _all: true },
        _max: { createdAt: true },
        // Most-sent first, then most recent — the order the team screens in.
        orderBy: [{ _count: { categoryId: 'desc' } }, { _max: { createdAt: 'desc' } }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.publicSubmission
        .groupBy({ by: ['categoryId', 'creatorNameRaw'], where, _count: { _all: true } })
        .then((all) => all.length),
    ]);

    if (pageGroups.length === 0) return paginate([], totalGroups, page, perPage);

    /**
     * The reasons people wrote are evidence the team reads, but a name sent in
     * two hundred times does not need two hundred of them on screen: sending
     * every one made a single page of the queue 5.5 MB, which is a real wait
     * on the phone this is often screened from. The count still comes from the
     * grouping, so it stays exact.
     */
    const [rowsPerGroup, categories] = await Promise.all([
      Promise.all(
        pageGroups.map((group) =>
          this.prisma.publicSubmission.findMany({
            where: { status, categoryId: group.categoryId, creatorNameRaw: group.creatorNameRaw },
            orderBy: { createdAt: 'desc' },
            take: ENTRIES_PER_GROUP,
          }),
        ),
      ),
      // The category belongs to the group, not to each entry — sending it with
      // all twenty was most of the weight of the page.
      this.prisma.category.findMany({
        where: { id: { in: [...new Set(pageGroups.map((group) => group.categoryId))] } },
        include: { edition: true },
      }),
    ]);
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const groups: GroupedSubmission[] = pageGroups.flatMap((group, index) => {
      const rows = rowsPerGroup[index];
      const category = categoryById.get(group.categoryId);
      if (!rows.length || !category) return [];
      return [
        {
          key: `${group.categoryId}::${group.creatorNameRaw.trim().toLowerCase()}`,
          creatorNameRaw: group.creatorNameRaw.trim(),
          category,
          count: group._count._all,
          latestAt: group._max.createdAt ?? rows[0].createdAt,
          entries: rows,
        },
      ];
    });

    return paginate(groups, totalGroups, page, perPage);
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
      // Two clicks half a second apart used to reach this together: both read
      // PENDING, both went on, and the second died on the unique nomination —
      // a 500 in the reviewer's face for pressing a button twice. Locking the
      // row makes the second one wait and then see what the first did.
      const [locked] = await tx.$queryRaw<{ status: SubmissionStatus }[]>`
        SELECT status FROM public_submissions WHERE id = ${id} FOR UPDATE
      `;
      if (locked?.status !== SubmissionStatus.PENDING) {
        throw new BadRequestException('That entry has already been reviewed');
      }

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

type QueueCategory = Prisma.CategoryGetPayload<{ include: { edition: true } }>;

type QueueRow = Prisma.PublicSubmissionGetPayload<{
  include: { category: { include: { edition: true } } };
}>;

/**
 * One name in one category, however many times it was sent in. `count` is the
 * true number; `entries` carries only the most recent few, since the reasons
 * repeat and the page is often read on a phone.
 */
export interface GroupedSubmission {
  key: string;
  creatorNameRaw: string;
  category: QueueCategory;
  count: number;
  latestAt: Date;
  entries: Prisma.PublicSubmissionGetPayload<object>[];
}

/**
 * Midnight in Vientiane, as an instant. "The same day" has to mean the day the
 * sender is living in, not whatever day it happens to be in UTC — otherwise
 * the window would roll over at 7am local time (PRD §10 timezone).
 *
 * Laos keeps UTC+7 all year and has no daylight saving, so the offset is a
 * constant rather than something to look up.
 */
function startOfDayInVientiane() {
  const OFFSET_MS = 7 * 60 * 60 * 1000;
  const local = new Date(Date.now() + OFFSET_MS);
  const midnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(midnightLocal - OFFSET_MS);
}

/**
 * Stored hashed, never raw (PRD §10). Salted with the JWT secret so the table
 * alone cannot be brute-forced back to addresses — the space of IPv4 is small
 * enough that an unsalted hash is barely a hash at all.
 */
/**
 * One value standing for "this name, in this category, from this address,
 * today in Vientiane" — the exact thing PRD §7.1 says counts once.
 */
function dedupeKey(categoryId: string, creatorNameRaw: string, ipHash: string) {
  const day = startOfDayInVientiane().toISOString().slice(0, 10);
  return createHash('sha256')
    .update([categoryId, creatorNameRaw, ipHash, day].join('|'))
    .digest('hex');
}

function hashIp(ip: string | undefined) {
  return createHash('sha256')
    .update(`${process.env.JWT_SECRET ?? ''}:${ip ?? 'unknown'}`)
    .digest('hex');
}
