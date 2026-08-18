import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import {
  CreateSponsorTierDto,
  DeleteSponsorTierDto,
  ReorderSponsorTiersDto,
  UpdateSponsorTierDto,
} from './dto/sponsor-tier.dto';
import { PrismaService } from '../../prisma/prisma.service';

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
      include: { _count: { select: { sponsors: true } } },
    });
  }

  async create(editionId: string, dto: CreateSponsorTierDto, actorId: string, ipAddress?: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');

    const last = await this.prisma.editionSponsorTier.findFirst({
      where: { editionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const tier = await this.prisma.editionSponsorTier.create({
      data: { ...dto, editionId, sortOrder: dto.sortOrder ?? (last?.sortOrder ?? -1) + 1 },
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
    const before = await this.prisma.editionSponsorTier.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Sponsor group not found');

    const after = await this.prisma.editionSponsorTier.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.updated',
      targetType: 'Edition',
      targetId: before.editionId,
      before,
      after,
      ipAddress,
    });
    return after;
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
      throw new BadRequestException('Every group must belong to this edition');
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
   * Deleting a group that still holds logos takes those logos with it, so it is
   * refused unless the caller says where they go. The back office asks; this is
   * what makes an unanswered question impossible to save through.
   */
  async remove(id: string, dto: DeleteSponsorTierDto, actorId: string, ipAddress?: string) {
    const tier = await this.prisma.editionSponsorTier.findUnique({
      where: { id },
      include: { _count: { select: { sponsors: true } } },
    });
    if (!tier) throw new NotFoundException('Sponsor group not found');

    if (tier._count.sponsors > 0) {
      if (!dto.moveToTierId) {
        throw new BadRequestException(
          `This group still holds ${tier._count.sponsors} sponsor(s) — say which group they move to`,
        );
      }
      const target = await this.prisma.editionSponsorTier.findUnique({
        where: { id: dto.moveToTierId },
      });
      if (!target || target.editionId !== tier.editionId || target.id === tier.id) {
        throw new BadRequestException('The group they move to must be another group of the same year');
      }
      await this.prisma.editionSponsor.updateMany({
        where: { tierId: tier.id },
        data: { tierId: target.id },
      });
    }

    await this.prisma.editionSponsorTier.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.deleted',
      targetType: 'Edition',
      targetId: tier.editionId,
      before: { nameLo: tier.nameLo, sponsors: tier._count.sponsors },
      after: dto.moveToTierId ? { movedTo: dto.moveToTierId } : undefined,
      ipAddress,
    });
  }

  /**
   * Most years sell much the same packages to much the same companies, so the
   * groups and the logos in them come across from the year before in one go and
   * the team removes whoever did not renew. Copying the names alone would leave
   * the longer half of the job undone.
   *
   * Refuses to run on a year that already has groups: this adds a starting point,
   * it does not merge into something the team has begun arranging.
   */
  async copyFromPrevious(editionId: string, actorId: string, ipAddress?: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');

    const existing = await this.prisma.editionSponsorTier.count({ where: { editionId } });
    if (existing > 0) {
      throw new BadRequestException('This year already has sponsor groups');
    }

    const previous = await this.prisma.edition.findFirst({
      where: { year: { lt: edition.year } },
      orderBy: { year: 'desc' },
      select: { id: true, year: true },
    });
    if (!previous) throw new BadRequestException('There is no earlier year to copy from');

    const tiers = await this.prisma.editionSponsorTier.findMany({
      where: { editionId: previous.id },
      orderBy: { sortOrder: 'asc' },
      include: { sponsors: { orderBy: { sortOrder: 'asc' } } },
    });
    if (tiers.length === 0) {
      throw new BadRequestException(`${previous.year} has no sponsor groups to copy`);
    }

    for (const tier of tiers) {
      await this.prisma.editionSponsorTier.create({
        data: {
          editionId,
          nameLo: tier.nameLo,
          nameEn: tier.nameEn,
          sortOrder: tier.sortOrder,
          sponsors: {
            create: tier.sponsors.map((sponsor) => ({
              editionId,
              name: sponsor.name,
              logoKey: sponsor.logoKey,
              websiteUrl: sponsor.websiteUrl,
              sortOrder: sponsor.sortOrder,
            })),
          },
        },
      });
    }

    await this.audit.log({
      userId: actorId,
      action: 'sponsorTier.copiedFromPrevious',
      targetType: 'Edition',
      targetId: editionId,
      after: {
        from: previous.year,
        groups: tiers.length,
        sponsors: tiers.reduce((total, tier) => total + tier.sponsors.length, 0),
      },
      ipAddress,
    });
    return this.listByEdition(editionId);
  }
}
