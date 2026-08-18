import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import {
  CopySponsorTiersDto,
  CreateSponsorTierDto,
  ReorderSponsorTiersDto,
  UpdateSponsorTierDto,
} from './dto/sponsor-tier.dto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * The headings sponsor logos sit under, per year. These were six values in an
 * enum, which made the words the developer's and the set fixed; they are rows
 * now, so the team names its own and a year that sells something new can say so.
 *
 * A new year starts with none on purpose. Seeding six defaults would put the
 * copy back in the code, one release after taking it out — the copy button is
 * how last year's list gets here, the same way categories arrive.
 */
@Injectable()
export class SponsorTiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listByEdition(editionId: string) {
    return this.prisma.editionSponsorTier.findMany({
      where: { editionId },
      orderBy: { sortOrder: 'asc' },
      // The count is what lets the back office refuse a delete before the
      // click rather than after it.
      include: { _count: { select: { sponsors: true } } },
    });
  }

  async create(editionId: string, dto: CreateSponsorTierDto, actorId: string, ipAddress?: string) {
    await this.assertEditionExists(editionId);
    await this.assertNameFree(editionId, dto.nameLo);

    const last = await this.prisma.editionSponsorTier.findFirst({
      where: { editionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const tier = await this.prisma.editionSponsorTier.create({
      data: { editionId, nameLo: dto.nameLo, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });

    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.created',
      targetType: 'Edition',
      targetId: editionId,
      after: { nameLo: tier.nameLo },
      ipAddress,
    });
    return tier;
  }

  async update(id: string, dto: UpdateSponsorTierDto, actorId: string, ipAddress?: string) {
    const before = await this.findById(id);
    if (dto.nameLo && dto.nameLo !== before.nameLo) {
      await this.assertNameFree(before.editionId, dto.nameLo);
    }

    const after = await this.prisma.editionSponsorTier.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.updated',
      targetType: 'Edition',
      targetId: before.editionId,
      before: { nameLo: before.nameLo },
      after: { nameLo: after.nameLo },
      ipAddress,
    });
    return after;
  }

  /**
   * Refuses to drop a tier that still holds logos. The foreign key says the
   * same thing, but a 409 out of the database reads as a bug; this says which
   * tier and how many sponsors are in the way.
   */
  async remove(id: string, actorId: string, ipAddress?: string) {
    const tier = await this.prisma.editionSponsorTier.findUnique({
      where: { id },
      include: { _count: { select: { sponsors: true } } },
    });
    if (!tier) throw new NotFoundException('Sponsor tier not found');

    if (tier._count.sponsors > 0) {
      throw new BadRequestException(
        `Move the ${tier._count.sponsors} sponsor(s) out of this tier first`,
      );
    }

    await this.prisma.editionSponsorTier.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.deleted',
      targetType: 'Edition',
      targetId: tier.editionId,
      before: { nameLo: tier.nameLo },
      ipAddress,
    });
  }

  async reorder(
    editionId: string,
    dto: ReorderSponsorTiersDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const owned = await this.prisma.editionSponsorTier.findMany({
      where: { editionId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((tier) => tier.id));
    if (dto.items.some((item) => !ownedIds.has(item.id))) {
      throw new BadRequestException('Every tier must belong to this edition');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.editionSponsorTier.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.reordered',
      targetType: 'Edition',
      targetId: editionId,
      after: { order: dto.items.map((item) => item.id) },
      ipAddress,
    });
    return this.listByEdition(editionId);
  }

  /**
   * Copies last year's tier list, which is how a new year gets one: the line-up
   * of what is sold changes far less often than who buys it. Names already here
   * are skipped rather than failing the whole copy, same as categories.
   */
  async copyFrom(editionId: string, dto: CopySponsorTiersDto, actorId: string, ipAddress?: string) {
    await this.assertEditionExists(editionId);
    if (dto.fromEditionId === editionId) {
      throw new BadRequestException('Pick a different edition to copy from');
    }

    const source = await this.prisma.editionSponsorTier.findMany({
      where: { editionId: dto.fromEditionId },
      orderBy: { sortOrder: 'asc' },
    });
    if (source.length === 0) throw new BadRequestException('That edition has no sponsor tiers');

    const existing = await this.prisma.editionSponsorTier.findMany({
      where: { editionId },
      select: { nameLo: true, sortOrder: true },
    });
    const taken = new Set(existing.map((tier) => tier.nameLo));
    const fresh = source.filter((tier) => !taken.has(tier.nameLo));

    // The highest number in use, not the row count: a list that has been
    // reordered can sit at 0,10,20 and starting from 3 lands in the middle
    // of it. Same trap as the category copy, same answer.
    const highest = existing.reduce((max, tier) => Math.max(max, tier.sortOrder), -1);

    if (fresh.length > 0) {
      await this.prisma.editionSponsorTier.createMany({
        data: fresh.map((tier, index) => ({
          editionId,
          nameLo: tier.nameLo,
          sortOrder: highest + 1 + index,
        })),
      });
    }

    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.copied',
      targetType: 'Edition',
      targetId: editionId,
      after: {
        fromEditionId: dto.fromEditionId,
        copied: fresh.length,
        skipped: source.length - fresh.length,
      },
      ipAddress,
    });

    return { copied: fresh.length, skipped: source.length - fresh.length };
  }

  /**
   * A tier belongs to one year, so a sponsor may only be filed under one of its
   * own year's. Nothing in the foreign key stops a 2025 logo pointing at a 2024
   * heading — the year page would then print a heading that is not in its list.
   */
  async assertTierBelongsTo(editionId: string, tierId: string) {
    const tier = await this.prisma.editionSponsorTier.findUnique({ where: { id: tierId } });
    if (!tier || tier.editionId !== editionId) {
      throw new BadRequestException('Pick a sponsor tier from this edition');
    }
    return tier;
  }

  private async findById(id: string) {
    const tier = await this.prisma.editionSponsorTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException('Sponsor tier not found');
    return tier;
  }

  private async assertNameFree(editionId: string, nameLo: string) {
    const clash = await this.prisma.editionSponsorTier.findUnique({
      where: { editionId_nameLo: { editionId, nameLo } },
    });
    if (clash) throw new ConflictException('That tier name is already used in this edition');
  }

  private async assertEditionExists(editionId: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');
  }
}
