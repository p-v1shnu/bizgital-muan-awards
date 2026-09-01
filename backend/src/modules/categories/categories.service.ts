import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EditionPhase } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CopyCategoriesDto,
  CreateCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listByEdition(editionId: string) {
    return this.prisma.category.findMany({
      where: { editionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { nominations: true } },
        // Only the winner is pulled in, so the admin can show progress and
        // run the pre-publish checklist without a request per category.
        nominations: { where: { isWinner: true }, include: { creator: true } },
      },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(editionId: string, dto: CreateCategoryDto, actorId: string, ipAddress?: string) {
    await this.assertCanAddCategories(editionId);

    const template = await this.prisma.categoryTemplate.findFirst({
      where: { id: dto.templateId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('Category template not found');
    await this.assertSlugFree(editionId, template.slug);

    // New categories land at the end of the list.
    const last = await this.prisma.category.findFirst({
      where: { editionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const category = await this.prisma.category.create({
      data: {
        editionId,
        templateId: template.id,
        slug: template.slug,
        nameLo: template.nameLo,
        nameEn: template.nameEn,
        descriptionLo: template.descriptionLo,
        groupLo: dto.groupLo,
        isFeatured: dto.isFeatured,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'category.created',
      targetType: 'Category',
      targetId: category.id,
      after: { editionId, slug: category.slug, nameLo: category.nameLo },
      ipAddress,
    });
    return category;
  }

  /**
   * A templated category's identity now lives in the library, not here — a
   * cascade from CategoryTemplatesService.update() keeps nameLo/slug/
   * descriptionLo in sync, so an edit landing here instead would just be
   * overwritten by the next library change, or drift silently out of sync
   * with it in the meantime. Only a category with no template of its own —
   * never assigned one, or made before the library existed — still owns
   * these fields directly, and keeps editing them here.
   */
  async update(id: string, dto: UpdateCategoryDto, actorId: string, ipAddress?: string) {
    const before = await this.findById(id);

    if (before.templateId) {
      const blocked = (['nameLo', 'nameEn', 'slug', 'descriptionLo', 'descriptionEn'] as const).filter(
        (field) => dto[field] !== undefined,
      );
      if (blocked.length > 0) {
        throw new BadRequestException(
          `This category comes from the library — edit ${blocked.join(', ')} there instead, not per edition`,
        );
      }
    }

    if (dto.slug && dto.slug !== before.slug) {
      await this.assertSlugFree(before.editionId, dto.slug);
    }

    const after = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'category.updated',
      targetType: 'Category',
      targetId: id,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  /** Refuses to drop a category that still holds nominees, so nothing is lost by a stray click. */
  async remove(id: string, actorId: string, ipAddress?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { nominations: true, submissions: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (category._count.nominations > 0) {
      throw new BadRequestException(
        `Remove the ${category._count.nominations} nominee(s) from this category first`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'category.deleted',
      targetType: 'Category',
      targetId: id,
      before: { editionId: category.editionId, slug: category.slug, nameLo: category.nameLo },
      ipAddress,
    });
  }

  async reorder(editionId: string, dto: ReorderCategoriesDto, actorId: string, ipAddress?: string) {
    const owned = await this.prisma.category.findMany({
      where: { editionId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((c) => c.id));
    const stray = dto.items.filter((i) => !ownedIds.has(i.id));
    if (stray.length > 0) {
      throw new BadRequestException('Every category must belong to this edition');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.category.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
      ),
    );

    await this.audit.log({
      userId: actorId,
      action: 'category.reordered',
      targetType: 'Edition',
      targetId: editionId,
      after: { order: dto.items.map((i) => i.id) },
      ipAddress,
    });
    return this.listByEdition(editionId);
  }

  /**
   * Copies a whole category list from another year — the usual way a new
   * edition starts, since the line-up changes little year to year. Slugs
   * already present are skipped rather than failing the whole copy.
   */
  async copyFrom(editionId: string, dto: CopyCategoriesDto, actorId: string, ipAddress?: string) {
    await this.assertCanAddCategories(editionId);
    if (dto.fromEditionId === editionId) {
      throw new BadRequestException('Pick a different edition to copy from');
    }

    const source = await this.prisma.category.findMany({
      where: { editionId: dto.fromEditionId },
      orderBy: { sortOrder: 'asc' },
    });
    if (source.length === 0) throw new BadRequestException('That edition has no categories');

    const existing = await this.prisma.category.findMany({
      where: { editionId },
      select: { slug: true, sortOrder: true },
    });
    const taken = new Set(existing.map((c) => c.slug));
    const fresh = source.filter((c) => !taken.has(c.slug));

    // Counting the rows gives the wrong first position the moment anything has
    // been reordered — five categories can sit at 0,10,20,30,40, and starting
    // the copy at 5 drops it into the middle of them. The highest number in use
    // is the only safe place to carry on from.
    const highest = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1);

    if (fresh.length > 0) {
      await this.prisma.category.createMany({
        data: fresh.map((c, index) => ({
          editionId,
          templateId: c.templateId,
          slug: c.slug,
          nameLo: c.nameLo,
          nameEn: c.nameEn,
          descriptionLo: c.descriptionLo,
          // Copied alongside descriptionLo, which it always should have been:
          // half a translation is worse than none, because the year page shows
          // one language falling back to the other mid-list.
          descriptionEn: c.descriptionEn,
          groupLo: c.groupLo,
          isFeatured: c.isFeatured,
          sortOrder: highest + 1 + index,
        })),
      });
    }

    await this.audit.log({
      userId: actorId,
      action: 'category.copied',
      targetType: 'Edition',
      targetId: editionId,
      after: { fromEditionId: dto.fromEditionId, copied: fresh.length, skipped: source.length - fresh.length },
      ipAddress,
    });

    return { copied: fresh.length, skipped: source.length - fresh.length };
  }

  /**
   * The shortlist is fixed the moment it goes public: a category appearing
   * after nominees are announced would be a prize nobody was told about
   * until it already had a result. Deleting one is guarded a different way
   * already — `remove` refuses a category that still holds a nominee, and
   * every category is required to have one before NOMINEES_ANNOUNCED — so
   * only adding needs a phase check of its own. Reopening the list means
   * rolling the edition back first (SUPER_ADMIN), not editing around it.
   */
  private async assertCanAddCategories(editionId: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');
    if (edition.phase !== EditionPhase.DRAFT && edition.phase !== EditionPhase.PUBLISHED) {
      throw new BadRequestException(
        `Cannot add a category once nominees are announced (edition is ${edition.phase}) — roll the phase back first`,
      );
    }
  }

  private async assertSlugFree(editionId: string, slug: string) {
    const clash = await this.prisma.category.findUnique({
      where: { editionId_slug: { editionId, slug } },
    });
    if (clash) throw new ConflictException('That slug is already used in this edition');
  }
}
