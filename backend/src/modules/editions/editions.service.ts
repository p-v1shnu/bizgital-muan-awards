import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Edition, EditionPhase, Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePhaseDto } from './dto/change-phase.dto';
import { CreateEditionDto } from './dto/create-edition.dto';
import { SubmissionsSwitchDto } from './dto/submissions-switch.dto';
import { UpdateEditionDto } from './dto/update-edition.dto';

/** Rank used to keep phase changes forward-only (PRD §4.4). */
const PHASE_ORDER: Record<EditionPhase, number> = {
  [EditionPhase.DRAFT]: 0,
  [EditionPhase.PUBLISHED]: 1,
  [EditionPhase.NOMINEES_ANNOUNCED]: 2,
  [EditionPhase.WINNERS_ANNOUNCED]: 3,
};

/** Everything the public may see. A DRAFT edition never leaves this service. */
const PUBLIC_PHASES: EditionPhase[] = [
  EditionPhase.PUBLISHED,
  EditionPhase.NOMINEES_ANNOUNCED,
  EditionPhase.WINNERS_ANNOUNCED,
];

@Injectable()
export class EditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Public reads ────────────────────────────────────────────
  // "Latest" means three different things depending on who is asking
  // (PRD §4.3.1); each one gets its own query so they cannot be confused.

  /** The timeline on /awards: every year the public may see, newest first. */
  listPublic() {
    return this.prisma.edition.findMany({
      where: { phase: { in: PUBLIC_PHASES } },
      orderBy: { year: 'desc' },
    });
  }

  /** What the nav and /awards/latest resolve to: the newest non-DRAFT year. */
  findLatestPublished() {
    return this.prisma.edition.findFirst({
      where: { phase: { in: PUBLIC_PHASES } },
      orderBy: { year: 'desc' },
    });
  }

  /**
   * What the homepage winners strip reads: the newest year that actually has
   * winners. A freshly published year must not blank the strip.
   */
  findLatestWithWinners() {
    return this.prisma.edition.findFirst({
      where: { phase: EditionPhase.WINNERS_ANNOUNCED },
      orderBy: { year: 'desc' },
    });
  }

  async findPublicBySlug(slug: string) {
    const edition = await this.prisma.edition.findFirst({
      where: { slug, phase: { in: PUBLIC_PHASES } },
    });
    if (!edition) throw new NotFoundException('Edition not found');
    return edition;
  }

  /**
   * Whether the submission form is live right now. Both switches are read at
   * request time, so submissionsCloseAt needs no scheduler (PRD §4.2).
   */
  isAcceptingSubmissions(edition: Pick<Edition, 'submissionsOpen' | 'submissionsCloseAt'>) {
    if (!edition.submissionsOpen) return false;
    return !edition.submissionsCloseAt || Date.now() < edition.submissionsCloseAt.getTime();
  }

  /** The one edition currently accepting entries, if any. */
  async findAcceptingSubmissions() {
    const edition = await this.prisma.edition.findFirst({ where: { submissionsOpen: true } });
    return edition && this.isAcceptingSubmissions(edition) ? edition : null;
  }

  // ── Admin reads ─────────────────────────────────────────────

  listAll() {
    return this.prisma.edition.findMany({ orderBy: { year: 'desc' } });
  }

  async findById(id: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id } });
    if (!edition) throw new NotFoundException('Edition not found');
    return edition;
  }

  // ── Writes ──────────────────────────────────────────────────

  async create(dto: CreateEditionDto, actorId: string, ipAddress?: string) {
    const clash = await this.prisma.edition.findFirst({
      where: { OR: [{ year: dto.year }, { slug: dto.slug }] },
    });
    if (clash) {
      throw new ConflictException(
        clash.year === dto.year ? 'That year already exists' : 'That slug is already taken',
      );
    }

    const edition = await this.prisma.edition.create({
      data: {
        ...dto,
        // A backfilled year may be entered straight at its final phase; only
        // later moves are constrained (PRD §4.4).
        phase: dto.phase ?? EditionPhase.DRAFT,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'edition.created',
      targetType: 'Edition',
      targetId: edition.id,
      after: { year: edition.year, phase: edition.phase },
      ipAddress,
    });
    return edition;
  }

  async update(id: string, dto: UpdateEditionDto, actorId: string, ipAddress?: string) {
    const before = await this.findById(id);

    if (dto.year && dto.year !== before.year) {
      const clash = await this.prisma.edition.findUnique({ where: { year: dto.year } });
      if (clash) throw new ConflictException('That year already exists');
    }
    if (dto.slug && dto.slug !== before.slug) {
      const clash = await this.prisma.edition.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('That slug is already taken');
    }

    const after = await this.prisma.edition.update({
      where: { id },
      data: {
        ...dto,
        eventDate: dto.eventDate === undefined ? undefined : new Date(dto.eventDate),
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'edition.updated',
      targetType: 'Edition',
      targetId: id,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  /**
   * Phase moves forward only. While an edition is still DRAFT it may jump to
   * any phase — that is how an old year is backfilled straight to
   * WINNERS_ANNOUNCED — but once it has left DRAFT it can never go back.
   */
  async changePhase(id: string, dto: ChangePhaseDto, actorId: string, ipAddress?: string) {
    const edition = await this.findById(id);
    if (edition.phase === dto.phase) return edition;

    const goingBackwards = PHASE_ORDER[dto.phase] < PHASE_ORDER[edition.phase];
    if (edition.phase !== EditionPhase.DRAFT && goingBackwards) {
      throw new BadRequestException(
        `Cannot move a published edition back from ${edition.phase} to ${dto.phase}`,
      );
    }
    if (dto.phase !== EditionPhase.DRAFT) await this.assertReadyToPublish(edition.id, dto.phase);

    const after = await this.prisma.edition.update({ where: { id }, data: { phase: dto.phase } });
    await this.audit.log({
      userId: actorId,
      action: 'edition.phase.changed',
      targetType: 'Edition',
      targetId: id,
      before: { phase: edition.phase },
      after: { phase: after.phase },
      ipAddress,
    });
    return after;
  }

  /**
   * Opening entries on one year closes them everywhere else: at most one
   * edition may collect submissions at a time (PRD §4.2).
   */
  async setSubmissions(
    id: string,
    dto: SubmissionsSwitchDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const edition = await this.findById(id);
    const closeAt = dto.submissionsCloseAt ? new Date(dto.submissionsCloseAt) : null;

    if (dto.submissionsOpen && closeAt && closeAt.getTime() <= Date.now()) {
      throw new BadRequestException('submissionsCloseAt must be in the future');
    }

    const { after, closedByThis } = await this.prisma.$transaction(async (tx) => {
      let closed: { id: string; year: number }[] = [];
      if (dto.submissionsOpen) {
        closed = await tx.edition.findMany({
          where: { submissionsOpen: true, id: { not: id } },
          select: { id: true, year: true },
        });
        await tx.edition.updateMany({
          where: { submissionsOpen: true, id: { not: id } },
          data: { submissionsOpen: false },
        });
      }
      const updated = await tx.edition.update({
        where: { id },
        data: { submissionsOpen: dto.submissionsOpen, submissionsCloseAt: closeAt },
      });
      return { after: updated, closedByThis: closed };
    });

    // Those other years were closed as a side effect, so they get their own
    // entries — an unrecorded state change would be a hole in the trail.
    for (const other of closedByThis) {
      await this.audit.log({
        userId: actorId,
        action: 'edition.submissions.closed',
        targetType: 'Edition',
        targetId: other.id,
        before: { submissionsOpen: true },
        after: { submissionsOpen: false },
        ipAddress,
      });
    }

    await this.audit.log({
      userId: actorId,
      action: dto.submissionsOpen ? 'edition.submissions.opened' : 'edition.submissions.closed',
      targetType: 'Edition',
      targetId: id,
      before: {
        submissionsOpen: edition.submissionsOpen,
        submissionsCloseAt: edition.submissionsCloseAt,
      },
      after: {
        submissionsOpen: after.submissionsOpen,
        submissionsCloseAt: after.submissionsCloseAt,
      },
      ipAddress,
    });
    return after;
  }

  /**
   * A preview link hands an outsider a way in, so who minted one and when it
   * lapses belongs in the trail even though nothing about the year changed.
   */
  async recordPreviewLink(
    edition: { id: string; year: number },
    actorId: string,
    expiresAt: Date,
    ipAddress?: string,
  ) {
    await this.audit.log({
      userId: actorId,
      action: 'edition.preview.minted',
      targetType: 'Edition',
      targetId: edition.id,
      after: { year: edition.year, expiresAt },
      ipAddress,
    });
  }

  /** A DRAFT year can be deleted outright; anything the public has seen cannot. */
  async remove(id: string, actorId: string, ipAddress?: string) {
    const edition = await this.findById(id);
    if (edition.phase !== EditionPhase.DRAFT) {
      throw new BadRequestException('Only a draft edition can be deleted');
    }
    await this.prisma.edition.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'edition.deleted',
      targetType: 'Edition',
      targetId: id,
      before: { year: edition.year },
      ipAddress,
    });
  }

  /**
   * The pre-publish checklist of PRD §4.3.3, as far as the database can check
   * it. Everything here is required content — the rest of the checklist is
   * editorial and stays with the team.
   */
  private async assertReadyToPublish(editionId: string, target: EditionPhase) {
    const problems: string[] = [];

    const categories = await this.prisma.category.count({ where: { editionId } });
    if (categories === 0) problems.push('the edition has no categories');

    if (target === EditionPhase.NOMINEES_ANNOUNCED || target === EditionPhase.WINNERS_ANNOUNCED) {
      const empty = await this.prisma.category.count({
        where: { editionId, nominations: { none: {} } },
      });
      if (empty > 0) problems.push(`${empty} category(ies) have no nominees`);
    }

    if (target === EditionPhase.WINNERS_ANNOUNCED) {
      const withoutWinner = await this.prisma.category.count({
        where: { editionId, nominations: { none: { isWinner: true } } },
      });
      if (withoutWinner > 0) problems.push(`${withoutWinner} category(ies) have no winner`);
    }

    if (problems.length > 0) {
      throw new BadRequestException(`Not ready to publish: ${problems.join('; ')}`);
    }
  }
}

/** Re-exported so other modules can filter by the same definition of "public". */
export const PUBLIC_EDITION_PHASES: Prisma.EnumEditionPhaseFilter = { in: PUBLIC_PHASES };
