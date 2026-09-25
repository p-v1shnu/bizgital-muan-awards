import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { cleanSocialLinks } from '../../common/utils/social-links';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCreatorDto, UpdateCreatorDto } from './dto/creator.dto';
import { RevokeCreatorDto } from './dto/revoke-creator.dto';

@Injectable()
export class CreatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    const where: Prisma.CreatorWhereInput = {
      deletedAt: null,
      ...(query.q
        ? { OR: [{ nameLo: { contains: query.q } }, { nameEn: { contains: query.q } }, { slug: { contains: query.q } }] }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.creator.findMany({
        where,
        orderBy: { nameLo: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { nominations: true } } },
      }),
      this.prisma.creator.count({ where }),
    ]);
    return paginate(data, total, page, perPage);
  }

  async findById(id: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { id, deletedAt: null },
      include: {
        nominations: {
          include: { category: { include: { edition: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    return creator;
  }

  /** Public profile page — only years the public may see (PRD §6.1). */
  async findPublicBySlug(slug: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug, deletedAt: null },
      include: {
        nominations: {
          where: { category: { edition: { phase: { in: ['PUBLISHED', 'NOMINEES_ANNOUNCED', 'WINNERS_ANNOUNCED'] } } } },
          include: { category: { include: { edition: true } } },
        },
      },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    return creator;
  }

  async create(dto: CreateCreatorDto, actorId: string, ipAddress?: string) {
    await this.assertSlugFree(dto.slug);

    const creator = await this.prisma.creator.create({
      data: { ...dto, socialLinks: cleanSocialLinks(dto.socialLinks) },
    });
    await this.audit.log({
      userId: actorId,
      action: 'creator.created',
      targetType: 'Creator',
      targetId: creator.id,
      after: { slug: creator.slug, nameLo: creator.nameLo },
      ipAddress,
    });
    return creator;
  }

  async update(id: string, dto: UpdateCreatorDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.creator.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Creator not found');
    if (dto.slug && dto.slug !== before.slug) await this.assertSlugFree(dto.slug);

    const after = await this.prisma.creator.update({
      where: { id },
      data: {
        ...dto,
        socialLinks: dto.socialLinks === undefined ? undefined : cleanSocialLinks(dto.socialLinks),
      },
    });
    await this.audit.log({
      userId: actorId,
      action: 'creator.updated',
      targetType: 'Creator',
      targetId: id,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  /**
   * Soft delete, and only once the creator holds no nominations — a name that
   * appears on a published year must keep resolving.
   */
  async remove(id: string, actorId: string, ipAddress?: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { nominations: true } } },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    if (creator._count.nominations > 0) {
      throw new BadRequestException(
        `This creator is nominated in ${creator._count.nominations} category(ies); remove those first`,
      );
    }

    await this.prisma.creator.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      userId: actorId,
      action: 'creator.removed',
      targetType: 'Creator',
      targetId: id,
      before: { slug: creator.slug, nameLo: creator.nameLo },
      ipAddress,
    });
  }

  /**
   * Strikes a creator's history from the public site without touching it —
   * every public query filters revokedAt the same way it already filters
   * deletedAt (see the field's own doc comment in schema.prisma). Unlike
   * remove() above, this works whether or not they hold any nominations,
   * since a creator without history would just as well have used remove().
   */
  async revoke(id: string, dto: RevokeCreatorDto, actorId: string, ipAddress?: string) {
    const creator = await this.prisma.creator.findFirst({ where: { id, deletedAt: null } });
    if (!creator) throw new NotFoundException('Creator not found');
    if (creator.revokedAt) throw new BadRequestException('Already revoked');

    const after = await this.prisma.creator.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: dto.reason },
    });
    await this.audit.log({
      userId: actorId,
      action: 'creator.revoked',
      targetType: 'Creator',
      targetId: id,
      before: { slug: creator.slug, nameLo: creator.nameLo },
      after: { revokedAt: after.revokedAt, reason: dto.reason },
      ipAddress,
    });
    return after;
  }

  /** Reverses a revocation — an appeal upheld, or one made in error. */
  async unrevoke(id: string, actorId: string, ipAddress?: string) {
    const creator = await this.prisma.creator.findFirst({ where: { id, deletedAt: null } });
    if (!creator) throw new NotFoundException('Creator not found');
    if (!creator.revokedAt) throw new BadRequestException('Not revoked');

    const after = await this.prisma.creator.update({
      where: { id },
      data: { revokedAt: null, revokedReason: null },
    });
    await this.audit.log({
      userId: actorId,
      action: 'creator.unrevoked',
      targetType: 'Creator',
      targetId: id,
      before: { revokedAt: creator.revokedAt, reason: creator.revokedReason },
      after: {},
      ipAddress,
    });
    return after;
  }

  private async assertSlugFree(slug: string) {
    const clash = await this.prisma.creator.findUnique({ where: { slug } });
    if (clash) throw new ConflictException('That slug is already taken');
  }
}
