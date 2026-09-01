import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSponsorTierTemplateDto, UpdateSponsorTierTemplateDto } from './dto/sponsor-tier-template.dto';

@Injectable()
export class SponsorTierTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    const where: Prisma.SponsorTierTemplateWhereInput = {
      deletedAt: null,
      ...(query.q ? { OR: [{ nameLo: { contains: query.q } }, { nameEn: { contains: query.q } }] } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sponsorTierTemplate.findMany({
        where,
        orderBy: { nameLo: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { tiers: true } } },
      }),
      this.prisma.sponsorTierTemplate.count({ where }),
    ]);
    return paginate(data, total, page, perPage);
  }

  async create(dto: CreateSponsorTierTemplateDto, actorId: string, ipAddress?: string) {
    const template = await this.prisma.sponsorTierTemplate.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTierTemplate.created',
      targetType: 'SponsorTierTemplate',
      targetId: template.id,
      after: { nameLo: template.nameLo },
      ipAddress,
    });
    return template;
  }

  /** A live link — see the schema comment on SponsorTierTemplate. Nothing here cascades by hand: every edition reads this row through its assignment. */
  async update(id: string, dto: UpdateSponsorTierTemplateDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.sponsorTierTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Sponsor tier template not found');

    const after = await this.prisma.sponsorTierTemplate.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTierTemplate.updated',
      targetType: 'SponsorTierTemplate',
      targetId: id,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  /** Soft delete, and only once no edition still has this tier assigned. */
  async remove(id: string, actorId: string, ipAddress?: string) {
    const template = await this.prisma.sponsorTierTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { tiers: true } } },
    });
    if (!template) throw new NotFoundException('Sponsor tier template not found');
    if (template._count.tiers > 0) {
      throw new BadRequestException(
        `This tier is assigned to ${template._count.tiers} edition(s); unassign those first`,
      );
    }

    await this.prisma.sponsorTierTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      userId: actorId,
      action: 'sponsorTierTemplate.removed',
      targetType: 'SponsorTierTemplate',
      targetId: id,
      before: { nameLo: template.nameLo },
      ipAddress,
    });
  }
}
