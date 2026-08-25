import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EditionPhase } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AddNominationDto, ReorderNominationsDto, SetWinnerDto } from './dto/nomination.dto';

@Injectable()
export class NominationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listByCategory(categoryId: string) {
    return this.prisma.nomination.findMany({
      where: { categoryId },
      orderBy: [{ isWinner: 'desc' }, { sortOrder: 'asc' }],
      include: { creator: true },
    });
  }

  async add(categoryId: string, dto: AddNominationDto, actorId: string, ipAddress?: string) {
    const [category, creator] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: categoryId } }),
      this.prisma.creator.findFirst({ where: { id: dto.creatorId, deletedAt: null } }),
    ]);
    if (!category) throw new NotFoundException('Category not found');
    if (!creator) throw new NotFoundException('Creator not found');

    const already = await this.prisma.nomination.findUnique({
      where: { categoryId_creatorId: { categoryId, creatorId: dto.creatorId } },
    });
    if (already) throw new ConflictException('That creator is already nominated in this category');

    const last = await this.prisma.nomination.findFirst({
      where: { categoryId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const nomination = await this.prisma.nomination.create({
      data: {
        categoryId,
        creatorId: dto.creatorId,
        sortOrder: dto.sortOrder ?? (last?.sortOrder ?? -1) + 1,
      },
      include: { creator: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'nomination.added',
      targetType: 'Category',
      targetId: categoryId,
      after: { creatorId: dto.creatorId, nameLo: creator.nameLo },
      ipAddress,
    });
    return nomination;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const nomination = await this.prisma.nomination.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');

    await this.prisma.nomination.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'nomination.removed',
      targetType: 'Category',
      targetId: nomination.categoryId,
      before: { creatorId: nomination.creatorId, nameLo: nomination.creator.nameLo, isWinner: nomination.isWinner },
      ipAddress,
    });
  }

  /**
   * At most one winner per category. Crowning someone un-crowns whoever held
   * it, in the same transaction, so the category is never briefly showing two.
   *
   * Un-crowning outright — leaving the category with nobody, rather than
   * crowning someone else — is refused once winners are public: that
   * category would suddenly show no result for a prize the public already
   * saw one for. Switching to a different nominee is unaffected, since that
   * crowns the replacement in this same call and never leaves the category
   * empty even for a moment. Earlier than WINNERS_ANNOUNCED, nothing has
   * been shown to anyone yet, so un-crowning stays as free as it always was.
   */
  async setWinner(id: string, dto: SetWinnerDto, actorId: string, ipAddress?: string) {
    const nomination = await this.prisma.nomination.findUnique({
      where: { id },
      include: { creator: true, category: { include: { edition: true } } },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');

    if (
      !dto.isWinner &&
      nomination.isWinner &&
      nomination.category.edition.phase === EditionPhase.WINNERS_ANNOUNCED
    ) {
      throw new BadRequestException(
        'Cannot remove the winner once winners are announced — crown a different nominee instead, or roll the phase back first',
      );
    }

    const { after, dethroned } = await this.prisma.$transaction(async (tx) => {
      let previous: { id: string; creatorId: string }[] = [];
      if (dto.isWinner) {
        previous = await tx.nomination.findMany({
          where: { categoryId: nomination.categoryId, isWinner: true, id: { not: id } },
          select: { id: true, creatorId: true },
        });
        await tx.nomination.updateMany({
          where: { categoryId: nomination.categoryId, isWinner: true, id: { not: id } },
          data: { isWinner: false },
        });
      }
      const updated = await tx.nomination.update({
        where: { id },
        data: { isWinner: dto.isWinner },
        include: { creator: true },
      });
      return { after: updated, dethroned: previous };
    });

    await this.audit.log({
      userId: actorId,
      action: dto.isWinner ? 'nomination.winner.set' : 'nomination.winner.cleared',
      targetType: 'Category',
      targetId: nomination.categoryId,
      before: { replacedWinners: dethroned.map((p) => p.creatorId) },
      after: { creatorId: after.creatorId, nameLo: after.creator.nameLo },
      ipAddress,
    });
    return after;
  }

  async reorder(categoryId: string, dto: ReorderNominationsDto, actorId: string, ipAddress?: string) {
    const owned = await this.prisma.nomination.findMany({
      where: { categoryId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((n) => n.id));
    if (dto.items.some((i) => !ownedIds.has(i.id))) {
      throw new BadRequestException('Every nomination must belong to this category');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.nomination.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
      ),
    );
    await this.audit.log({
      userId: actorId,
      action: 'nomination.reordered',
      targetType: 'Category',
      targetId: categoryId,
      after: { order: dto.items.map((i) => i.id) },
      ipAddress,
    });
    return this.listByCategory(categoryId);
  }
}
