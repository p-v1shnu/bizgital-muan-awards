import { Injectable, NotFoundException } from '@nestjs/common';
import { EditionPhase } from '@prisma/client';

import { EditionsService } from '../editions/editions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PreviewService } from './preview.service';

/** Years a visitor may reach at all. DRAFT is only ever reachable via preview. */
const VISIBLE: EditionPhase[] = [
  EditionPhase.PUBLISHED,
  EditionPhase.NOMINEES_ANNOUNCED,
  EditionPhase.WINNERS_ANNOUNCED,
];

/**
 * Years whose *shortlist* is public — which is not the same set, and the
 * difference is the whole point of PUBLISHED existing.
 *
 * A published year shows its categories, its panel and its sponsors while the
 * nominees are still being decided. The rows are in the database the whole
 * time, so anything counted or listed from a nomination has to use this set,
 * not the one above. It did not, and three things gave the shortlist away
 * before the announcement: a creator's URL appeared in sitemap.xml the moment
 * they were nominated, the running total on the homepage went up by one, and
 * the entry form began suggesting their name.
 */
const ANNOUNCED: EditionPhase[] = [
  EditionPhase.NOMINEES_ANNOUNCED,
  EditionPhase.WINNERS_ANNOUNCED,
];

/**
 * What a phase is allowed to reveal (PRD §4.1).
 *
 * This matters more than it looks: the team ticks winners into the database
 * *before* announcing them, so a year sitting at NOMINEES_ANNOUNCED holds the
 * result already. Reading `isWinner` straight from the row would publish the
 * outcome early, so it is stripped here rather than trusted.
 */
function reveals(phase: EditionPhase) {
  return {
    nominees: phase === EditionPhase.NOMINEES_ANNOUNCED || phase === EditionPhase.WINNERS_ANNOUNCED,
    winners: phase === EditionPhase.WINNERS_ANNOUNCED,
  };
}

export interface ViewerContext {
  /** A signed-in admin sees drafts; anyone else needs a preview token. */
  isAdmin: boolean;
  previewToken?: string;
}

/**
 * What this particular viewer may see, which is the phase rule for everyone
 * except a signed-in admin.
 *
 * The team has to be able to read its own year page before announcing it: the
 * phase change is forward-only (PRD §4.4), so "announce and then look" cannot
 * be undone, and the nominee list and the results are exactly the two things
 * worth proofreading. A signed-in admin therefore sees them early.
 *
 * A preview *token* holder does not. The token exists to show an unpublished
 * year to somebody outside the team (PRD §4.3.2) — a sponsor, a photographer —
 * and the result of an award is the one thing that must not travel that way.
 * The link stays as honest as the public page.
 */
function revealsFor(phase: EditionPhase, viewer: ViewerContext) {
  const forPublic = reveals(phase);
  const shown = viewer.isAdmin ? { nominees: true, winners: true } : forPublic;
  return {
    ...shown,
    /** True when this viewer is seeing something the public cannot yet. */
    aheadOfPublic:
      (shown.nominees && !forPublic.nominees) || (shown.winners && !forPublic.winners),
  };
}

@Injectable()
export class PublicSiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly editions: EditionsService,
    private readonly preview: PreviewService,
  ) {}

  // ── the year page ───────────────────────────────────────────

  /**
   * Everything /awards/[year] renders, in one request: the edition, its
   * categories (with nominees once the phase allows), the panel and the
   * sponsors.
   */
  async edition(slug: string, viewer: ViewerContext) {
    const edition = await this.prisma.edition.findUnique({ where: { slug } });
    if (!edition) throw new NotFoundException('Edition not found');

    const previewing = await this.resolvePreview(edition.id, edition.phase, viewer);
    // A draft is previewed as it will look once published, which is the
    // question the team is actually asking when they open the link.
    const asPhase = edition.phase === EditionPhase.DRAFT ? EditionPhase.PUBLISHED : edition.phase;
    const show = revealsFor(asPhase, viewer);

    const [categories, judges, sponsors] = await Promise.all([
      // Nominees are always fetched but only ever emitted when the phase
      // allows: one query shape, and one place where the gate is applied.
      this.prisma.category.findMany({
        where: { editionId: edition.id },
        orderBy: { sortOrder: 'asc' },
        include: { nominations: { orderBy: { sortOrder: 'asc' }, include: { creator: true } } },
      }),
      this.prisma.editionJudge.findMany({
        where: { editionId: edition.id },
        orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
        include: { judge: true },
      }),
      this.prisma.editionSponsor.findMany({
        where: { editionId: edition.id },
        orderBy: [{ tier: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        include: { tier: { select: { id: true, nameLo: true } } },
      }),
    ]);

    return {
      ...this.editionShape(edition),
      // Non-null whenever the page in front of this viewer is not the page the
      // public gets — either because the year is unpublished, or because an
      // admin is seeing past the phase. The banner depends on knowing which.
      preview:
        previewing || show.aheadOfPublic
          ? { phase: edition.phase, aheadOfPublic: show.aheadOfPublic }
          : null,
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        nameLo: category.nameLo,
        nameEn: category.nameEn,
        descriptionLo: category.descriptionLo,
        groupLo: category.groupLo,
        isFeatured: category.isFeatured,
        nominees: show.nominees
          ? category.nominations.map((nomination) => this.nomineeShape(nomination, show.winners))
          : [],
      })),
      judges: judges.map((assignment) => ({
        id: assignment.id,
        role: assignment.role,
        nameLo: assignment.judge.nameLo,
        nameEn: assignment.judge.nameEn,
        positionLo: assignment.judge.positionLo,
        bioLo: assignment.judge.bioLo,
        avatarKey: assignment.judge.avatarKey,
      })),
      // The group's id as well as its name: two groups of one year may end up
      // with the same name, and grouping the page by the name would merge them.
      sponsors: sponsors.map((sponsor) => ({
        id: sponsor.id,
        name: sponsor.name,
        logoKey: sponsor.logoKey,
        websiteUrl: sponsor.websiteUrl,
        tierId: sponsor.tier.id,
        tierNameLo: sponsor.tier.nameLo,
      })),
    };
  }

  /** One category of one year — the page a Facebook share links to. */
  async category(slug: string, categorySlug: string, viewer: ViewerContext) {
    const edition = await this.prisma.edition.findUnique({ where: { slug } });
    if (!edition) throw new NotFoundException('Edition not found');
    const previewing = await this.resolvePreview(edition.id, edition.phase, viewer);

    const category = await this.prisma.category.findUnique({
      where: { editionId_slug: { editionId: edition.id, slug: categorySlug } },
      include: { nominations: { orderBy: { sortOrder: 'asc' }, include: { creator: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    const asPhase = edition.phase === EditionPhase.DRAFT ? EditionPhase.PUBLISHED : edition.phase;
    const show = revealsFor(asPhase, viewer);

    return {
      edition: this.editionShape(edition),
      preview:
        previewing || show.aheadOfPublic
          ? { phase: edition.phase, aheadOfPublic: show.aheadOfPublic }
          : null,
      id: category.id,
      slug: category.slug,
      nameLo: category.nameLo,
      nameEn: category.nameEn,
      descriptionLo: category.descriptionLo,
      groupLo: category.groupLo,
      isFeatured: category.isFeatured,
      nominees: show.nominees ? category.nominations.map((n) => this.nomineeShape(n, show.winners)) : [],
    };
  }

  // ── the hall of winners ─────────────────────────────────────

  /**
   * /winners, newest year first. Only years that have announced results
   * appear, so the page never shows an empty heading for a year in progress.
   */
  async winners() {
    const editions = await this.prisma.edition.findMany({
      where: { phase: EditionPhase.WINNERS_ANNOUNCED },
      orderBy: { year: 'desc' },
      include: {
        categories: {
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
          include: {
            nominations: { where: { isWinner: true }, include: { creator: true } },
          },
        },
      },
    });

    return editions.map((edition) => ({
      ...this.editionShape(edition),
      categories: edition.categories
        // A category with no winner is simply left out rather than rendered blank.
        .filter((category) => category.nominations.length > 0)
        .map((category) => ({
          id: category.id,
          slug: category.slug,
          nameLo: category.nameLo,
          isFeatured: category.isFeatured,
          winner: this.creatorShape(category.nominations[0].creator),
        })),
    }));
  }

  // ── the submission form ─────────────────────────────────────

  /**
   * What the public form needs to render: the year taking entries and the
   * categories to choose from — or, when nothing is open, why not.
   *
   * It used to answer a bare null for every closed state, and the page could
   * only say "not open yet". That is the wrong sentence in the case that
   * matters most: somebody arriving the day after the deadline was told to
   * wait for something that had already happened and closed. PRD §4.2 asks for
   * three states and this is what tells them apart.
   */
  async submissionForm() {
    const edition = await this.editions.findAcceptingSubmissions();
    if (!edition) {
      // A newer year already published but never yet opened outranks any
      // older one that has already been through its own cycle — someone
      // arriving between two editions is looking forward to the next one,
      // not back at a cycle that has nothing left to do with them.
      const [upcoming, closed] = await Promise.all([
        this.prisma.edition.findFirst({
          where: { phase: { in: VISIBLE }, submissionsOpenedAt: null },
          orderBy: { year: 'asc' },
        }),
        // The most recent year that ever took entries, if there is one — its
        // deadline is what a late arrival is looking for.
        this.prisma.edition.findFirst({
          where: { phase: { in: VISIBLE }, submissionsOpenedAt: { not: null } },
          orderBy: { year: 'desc' },
        }),
      ]);

      if (upcoming) {
        return {
          state: 'upcoming' as const,
          edition: this.editionShape(upcoming),
          previousClosed: closed ? this.editionShape(closed) : null,
        };
      }

      return closed
        ? {
            state: 'closed' as const,
            edition: this.editionShape(closed),
            closedAt: closed.submissionsCloseAt,
          }
        : { state: 'never-opened' as const };
    }

    const categories = await this.prisma.category.findMany({
      where: { editionId: edition.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, nameLo: true, groupLo: true, descriptionLo: true },
    });

    return {
      state: 'open' as const,
      edition: this.editionShape(edition),
      closesAt: edition.submissionsCloseAt,
      categories,
    };
  }

  /**
   * Name suggestions for the public form (PRD §7.1). Without them the same
   * person arrives as "ຄຳຫຼ້າ", "คำหล้า" and "Khamla", and the screening queue
   * shows three rows of one each instead of one row of three.
   *
   * Only creators who already appear on a year the public can see — so the
   * box can never reveal that someone has been entered into a draft.
   */
  async creatorSuggestions(term: string) {
    const query = term.trim();
    if (query.length < 2) return [];

    return this.prisma.creator.findMany({
      where: {
        deletedAt: null,
        nominations: { some: { category: { edition: { phase: { in: ANNOUNCED } } } } },
        OR: [{ nameLo: { contains: query } }, { nameEn: { contains: query } }],
      },
      select: { slug: true, nameLo: true, nameEn: true },
      orderBy: { nameLo: 'asc' },
      take: 8,
    });
  }

  // ── creator profile ─────────────────────────────────────────

  async creator(slug: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug, deletedAt: null },
      include: {
        nominations: {
          where: { category: { edition: { phase: { in: ANNOUNCED } } } },
          include: { category: { include: { edition: true } } },
        },
      },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    return {
      ...this.creatorShape(creator),
      bioLo: creator.bioLo,
      appearances: creator.nominations
        // A nomination is only public once its year has announced nominees;
        // the winner mark waits for the results.
        .filter((nomination) => reveals(nomination.category.edition.phase).nominees)
        .map((nomination) => ({
          year: nomination.category.edition.year,
          editionSlug: nomination.category.edition.slug,
          categorySlug: nomination.category.slug,
          categoryNameLo: nomination.category.nameLo,
          isWinner:
            reveals(nomination.category.edition.phase).winners && nomination.isWinner,
        }))
        .sort((a, b) => b.year - a.year),
    };
  }

  /**
   * The running totals on the homepage. Counted from the data rather than
   * typed in, so they stay true when a year is added and nobody remembers to
   * update a number.
   */
  async stats() {
    const [years, categories, creators] = await Promise.all([
      this.prisma.edition.count({ where: { phase: { in: VISIBLE } } }),
      this.prisma.category.count({ where: { edition: { phase: { in: VISIBLE } } } }),
      // Distinct people who have appeared, not every row in the library.
      this.prisma.creator.count({
        where: {
          deletedAt: null,
          nominations: { some: { category: { edition: { phase: { in: ANNOUNCED } } } } },
        },
      }),
    ]);
    return { years, categories, creators };
  }

  /** Every URL the sitemap should list. */
  async sitemapEntries() {
    const editions = await this.prisma.edition.findMany({
      where: { phase: { in: VISIBLE } },
      orderBy: { year: 'desc' },
      include: { categories: { orderBy: { sortOrder: 'asc' }, select: { slug: true } } },
    });
    const creators = await this.prisma.creator.findMany({
      where: { deletedAt: null, nominations: { some: { category: { edition: { phase: { in: ANNOUNCED } } } } } },
      select: { slug: true, updatedAt: true },
    });

    return {
      editions: editions.map((edition) => ({
        slug: edition.slug,
        updatedAt: edition.updatedAt,
        categories: edition.categories.map((category) => category.slug),
      })),
      creators,
    };
  }

  // ── helpers ─────────────────────────────────────────────────

  /**
   * Decides whether this viewer may see a hidden year, and throws when they
   * may not. Returns true when the year is only visible because of a preview.
   */
  private async resolvePreview(editionId: string, phase: EditionPhase, viewer: ViewerContext) {
    if (VISIBLE.includes(phase)) return false;
    if (viewer.isAdmin) return true;

    const unlocked = await this.preview.editionFor(viewer.previewToken);
    if (unlocked === editionId) return true;

    // Deliberately the same answer as a year that does not exist: a stranger
    // must not learn that next year's page is already being built.
    throw new NotFoundException('Edition not found');
  }

  private editionShape(edition: {
    id: string;
    year: number;
    slug: string;
    titleLo: string;
    titleEn: string | null;
    descriptionLo: string | null;
    phase: EditionPhase;
    eventDate: Date | null;
    venueLo: string | null;
    activitiesLo: string | null;
    heroImageKey: string | null;
    galleryImageKeys: unknown;
    ticketUrl: string | null;
    voteUrl: string | null;
    highlightUrl: string | null;
    submissionsOpen: boolean;
    submissionsCloseAt: Date | null;
    submissionsOpenedAt: Date | null;
  }) {
    return {
      id: edition.id,
      year: edition.year,
      slug: edition.slug,
      titleLo: edition.titleLo,
      titleEn: edition.titleEn,
      descriptionLo: edition.descriptionLo,
      phase: edition.phase,
      eventDate: edition.eventDate,
      venueLo: edition.venueLo,
      activitiesLo: edition.activitiesLo,
      heroImageKey: edition.heroImageKey,
      galleryImageKeys: edition.galleryImageKeys,
      ticketUrl: edition.ticketUrl,
      voteUrl: edition.voteUrl,
      highlightUrl: edition.highlightUrl,
      // The second switch of PRD §4, which the year page never received and so
      // guessed at from the phase — showing "send us a name" on a published
      // year with no form open, and hiding it the moment nominees were
      // announced while the form was still taking entries.
      //
      // Sent already decided rather than as the raw column: whether the form is
      // open is `submissionsOpen` *and* the closing time, and that is one rule
      // that belongs in one place.
      acceptingSubmissions: this.editions.isAcceptingSubmissions(edition),
      submissionsCloseAt: edition.submissionsCloseAt,
      /** Tells "closed" apart from "never opened" — the third row of §4.2. */
      submissionsHaveOpened: edition.submissionsOpenedAt !== null,
    };
  }

  private nomineeShape(
    nomination: { id: string; isWinner: boolean; creator: Parameters<PublicSiteService['creatorShape']>[0] },
    showWinners: boolean,
  ) {
    return {
      id: nomination.id,
      isWinner: showWinners && nomination.isWinner,
      creator: this.creatorShape(nomination.creator),
    };
  }

  private creatorShape(creator: {
    id: string;
    slug: string;
    nameLo: string;
    nameEn: string | null;
    avatarKey: string | null;
    socialLinks: unknown;
  }) {
    return {
      id: creator.id,
      slug: creator.slug,
      nameLo: creator.nameLo,
      nameEn: creator.nameEn,
      avatarKey: creator.avatarKey,
      socialLinks: creator.socialLinks,
    };
  }
}
