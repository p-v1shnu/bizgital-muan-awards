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
        // Three cases, not two. Absent means leave it; a date means set it;
        // null means the team cleared the box and wants it gone. `new Date(null)`
        // is 1 January 1970, so folding the last two together would have put a
        // 1970 date on the year page the first time anyone emptied the field.
        eventDate: dto.eventDate == null ? (dto.eventDate as null | undefined) : new Date(dto.eventDate),
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
   *
   * Two things about the year's content are refused outright, and only two —
   * see `assertAnnouncable`. Everything else on the pre-publish checklist is a
   * warning shown beside the button (PRD §4.3.3).
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

    await this.assertAnnouncable(edition.id, dto.phase);

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
        data: {
          submissionsOpen: dto.submissionsOpen,
          submissionsCloseAt: closeAt,
          // Stamped the first time only. Re-opening to extend a deadline is
          // the same window continuing, and closing must not erase the fact
          // that it happened — that is the whole reason the column exists.
          ...(dto.submissionsOpen && !edition.submissionsOpenedAt
            ? { submissionsOpenedAt: new Date() }
            : {}),
        },
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
   * The two states an announcement cannot be true in.
   *
   * Everything else on the checklist is editorial — a year with no venue is
   * incomplete, not wrong. These two are different: a category announced with
   * nobody in it is a public statement that a prize exists and has no
   * shortlist, and the visitor is left looking at a heading that opens on
   * nothing. Publishing the year itself is not gated, because at that point
   * nominees are not supposed to exist yet (PRD §4.1).
   *
   * The way out is to remove the category, not to invent a nominee for it: a
   * year copied from the one before arrives with every heading of a bigger
   * year, and the ones that drew no entries are meant to be deleted before the
   * shortlist goes out.
   */
  private async assertAnnouncable(editionId: string, target: EditionPhase) {
    if (target !== EditionPhase.NOMINEES_ANNOUNCED && target !== EditionPhase.WINNERS_ANNOUNCED) {
      return;
    }

    const empty = await this.prisma.category.findMany({
      where: { editionId, nominations: { none: {} } },
      select: { nameLo: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (empty.length > 0) {
      throw new BadRequestException(
        `ຍັງມີ ${empty.length} ສາຂາທີ່ບໍ່ມີນອມິນີ: ${empty.map((c) => c.nameLo).join(', ')} — ` +
          'ໃສ່ນອມິນີ ຫຼື ລຶບສາຂານັ້ນອອກກ່ອນ',
      );
    }

    if (target === EditionPhase.WINNERS_ANNOUNCED) {
      const withoutWinner = await this.prisma.category.findMany({
        where: { editionId, nominations: { none: { isWinner: true } } },
        select: { nameLo: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (withoutWinner.length > 0) {
        throw new BadRequestException(
          `ຍັງມີ ${withoutWinner.length} ສາຂາທີ່ຍັງບໍ່ໄດ້ຕິດຜູ້ຊະນະ: ` +
            `${withoutWinner.map((c) => c.nameLo).join(', ')} — ຕິດຜູ້ຊະນະ ຫຼື ລຶບສາຂານັ້ນອອກກ່ອນ`,
        );
      }
    }
  }
}

/** Re-exported so other modules can filter by the same definition of "public". */
export const PUBLIC_EDITION_PHASES: Prisma.EnumEditionPhaseFilter = { in: PUBLIC_PHASES };
