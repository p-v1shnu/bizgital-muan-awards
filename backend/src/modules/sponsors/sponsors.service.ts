import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { CreateSponsorDto, ReorderSponsorsDto, UpdateSponsorDto } from './dto/sponsor.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listByEdition(editionId: string) {
    return this.prisma.editionSponsor.findMany({
      where: { editionId },
      orderBy: [{ tier: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  /**
   * A logo may only go in a group of its own year. Without this a request could
   * hang 2026's sponsor under one of 2025's groups, and the year page would draw
   * it on neither.
   */
  private async assertTierBelongs(editionId: string, tierId: string) {
    const tier = await this.prisma.editionSponsorTier.findUnique({ where: { id: tierId } });
    if (!tier || tier.editionId !== editionId) {
      throw new BadRequestException('The sponsor group must belong to this edition');
    }
  }

  async create(editionId: string, dto: CreateSponsorDto, actorId: string, ipAddress?: string) {
    const edition = await this.prisma.edition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');
    await this.assertTierBelongs(editionId, dto.tierId);

    const last = await this.prisma.editionSponsor.findFirst({
      where: { editionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const sponsor = await this.prisma.editionSponsor.create({
      data: { ...dto, editionId, sortOrder: dto.sortOrder ?? (last?.sortOrder ?? -1) + 1 },
    });
    await this.audit.log({
      userId: actorId,
      action: 'sponsor.created',
      targetType: 'Edition',
      targetId: editionId,
      after: { name: sponsor.name, tierId: sponsor.tierId },
      ipAddress,
    });
    return sponsor;
  }

  async reorder(editionId: string, dto: ReorderSponsorsDto, actorId: string, ipAddress?: string) {
    const owned = await this.prisma.editionSponsor.findMany({
      where: { editionId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((sponsor) => sponsor.id));
    if (dto.items.some((item) => !ownedIds.has(item.id))) {
      throw new BadRequestException('Every sponsor must belong to this edition');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.editionSponsor.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    await this.audit.log({
      userId: actorId,
      action: 'sponsor.reordered',
      targetType: 'Edition',
      targetId: editionId,
      after: { order: dto.items.map((item) => item.id) },
      ipAddress,
    });
    return this.listByEdition(editionId);
  }

  async update(id: string, dto: UpdateSponsorDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.editionSponsor.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Sponsor not found');
    if (dto.tierId) await this.assertTierBelongs(before.editionId, dto.tierId);

    const after = await this.prisma.editionSponsor.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'sponsor.updated',
      targetType: 'Edition',
      targetId: before.editionId,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const sponsor = await this.prisma.editionSponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException('Sponsor not found');

    await this.prisma.editionSponsor.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'sponsor.deleted',
      targetType: 'Edition',
      targetId: sponsor.editionId,
      before: { name: sponsor.name, tierId: sponsor.tierId },
      ipAddress,
    });
  }
}
