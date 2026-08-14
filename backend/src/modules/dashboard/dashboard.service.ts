import { Injectable } from '@nestjs/common';
import { EditionPhase, SubmissionStatus } from '@prisma/client';

import { EditionsService } from '../editions/editions.service';
import { PrismaService } from '../../prisma/prisma.service';

/** One task the team still has to do, and whether it blocks a phase. */
export interface PendingTask {
  key: string;
  severity: 'blocking' | 'attention' | 'info';
  blocks: EditionPhase | null;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly editions: EditionsService,
  ) {}

  /**
   * What /admin opens on. "The edition being worked on" is the newest by year
   * including drafts — deliberately not any of the three public "latest"
   * queries (PRD §4.3.1), because the team works on the draft nobody sees yet.
   */
  async overview() {
    const edition = await this.prisma.edition.findFirst({ orderBy: { year: 'desc' } });
    if (!edition) {
      return { edition: null, stats: null, tasks: [], categories: [] };
    }

    const [categories, nominationCount, judgeCount, sponsorCount, pendingSubmissions] =
      await Promise.all([
        this.prisma.category.findMany({
          where: { editionId: edition.id },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { nominations: true } },
            nominations: { where: { isWinner: true }, include: { creator: true } },
          },
        }),
        this.prisma.nomination.count({ where: { category: { editionId: edition.id } } }),
        this.prisma.editionJudge.count({ where: { editionId: edition.id } }),
        this.prisma.editionSponsor.count({ where: { editionId: edition.id } }),
        this.prisma.publicSubmission.count({
          where: { status: SubmissionStatus.PENDING, category: { editionId: edition.id } },
        }),
      ]);

    const emptyCategories = categories.filter((c) => c._count.nominations === 0).length;
    const withoutWinner = categories.filter((c) => c.nominations.length === 0).length;

    const tasks: PendingTask[] = [];
    if (categories.length === 0) {
      tasks.push({ key: 'no-categories', severity: 'blocking', blocks: EditionPhase.PUBLISHED, count: 0 });
    }
    if (emptyCategories > 0) {
      tasks.push({
        key: 'categories-without-nominees',
        severity: 'blocking',
        blocks: EditionPhase.NOMINEES_ANNOUNCED,
        count: emptyCategories,
      });
    }
    if (categories.length > 0 && withoutWinner > 0) {
      tasks.push({
        key: 'categories-without-winner',
        severity: 'blocking',
        blocks: EditionPhase.WINNERS_ANNOUNCED,
        count: withoutWinner,
      });
    }
    if (pendingSubmissions > 0) {
      tasks.push({ key: 'submissions-pending', severity: 'attention', blocks: null, count: pendingSubmissions });
    }
    if (judgeCount === 0) {
      tasks.push({ key: 'no-judges', severity: 'attention', blocks: null, count: 0 });
    }
    if (!edition.heroImageKey) {
      tasks.push({ key: 'no-hero-image', severity: 'info', blocks: null, count: 0 });
    }

    return {
      edition: {
        ...edition,
        acceptingSubmissions: this.editions.isAcceptingSubmissions(edition),
      },
      stats: {
        pendingSubmissions,
        categories: categories.length,
        featuredCategories: categories.filter((c) => c.isFeatured).length,
        nominations: nominationCount,
        judges: judgeCount,
        sponsors: sponsorCount,
      },
      tasks,
      categories: categories.map((c) => ({
        id: c.id,
        nameLo: c.nameLo,
        slug: c.slug,
        isFeatured: c.isFeatured,
        nominationCount: c._count.nominations,
        winner: c.nominations[0]?.creator ?? null,
      })),
    };
  }
}
