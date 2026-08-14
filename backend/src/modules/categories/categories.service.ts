import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

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
    await this.assertEditionExists(editionId);
    await this.assertSlugFree(editionId, dto.slug);

    // New categories land at the end of the list.
    const last = await this.prisma.category.findFirst({
      where: { editionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const category = await this.prisma.category.create({
      data: { ...dto, editionId, sortOrder: (last?.sortOrder ?? -1) + 1 },
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

  async update(id: string, dto: UpdateCategoryDto, actorId: string, ipAddress?: string) {
    const before = await this.findById(id);
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
    await this.assertEditionExists(editionId);
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
      select: { slug: true },
    });
    const taken = new Set(existing.map((c) => c.slug));
    const fresh = source.filter((c) => !taken.has(c.slug));

    if (fresh.length > 0) {
      await this.prisma.category.createMany({
        data: fresh.map((c, index) => ({
          editionId,
          slug: c.slug,
          nameLo: c.nameLo,
          nameEn: c.nameEn,
          descriptionLo: c.descriptionLo,
          groupLo: c.groupLo,
          isFeatured: c.isFeatured,
          sortOrder: existing.length + index,
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

  private async assertEditionExists(editionId: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');
  }

  private async assertSlugFree(editionId: string, slug: string) {
    const clash = await this.prisma.category.findUnique({
      where: { editionId_slug: { editionId, slug } },
    });
    if (clash) throw new ConflictException('That slug is already used in this edition');
  }
}
