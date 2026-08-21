import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryTemplateDto, UpdateCategoryTemplateDto } from './dto/category-template.dto';

@Injectable()
export class CategoryTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The picker's search, and the library's own list — same query either way. */
  async list(query: PaginationDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    const where: Prisma.CategoryTemplateWhereInput = {
      deletedAt: null,
      ...(query.q
        ? { OR: [{ nameLo: { contains: query.q } }, { nameEn: { contains: query.q } }, { slug: { contains: query.q } }] }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.categoryTemplate.findMany({
        where,
        orderBy: { nameLo: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { categories: true } } },
      }),
      this.prisma.categoryTemplate.count({ where }),
    ]);
    return paginate(data, total, page, perPage);
  }

  async create(dto: CreateCategoryTemplateDto, actorId: string, ipAddress?: string) {
    await this.assertSlugFree(dto.slug);

    const template = await this.prisma.categoryTemplate.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'category-template.created',
      targetType: 'CategoryTemplate',
      targetId: template.id,
      after: { slug: template.slug, nameLo: template.nameLo },
      ipAddress,
    });
    return template;
  }

  async update(id: string, dto: UpdateCategoryTemplateDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.categoryTemplate.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Category template not found');
    if (dto.slug && dto.slug !== before.slug) await this.assertSlugFree(dto.slug);

    const after = await this.prisma.categoryTemplate.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'category-template.updated',
      targetType: 'CategoryTemplate',
      targetId: id,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  /**
   * Soft delete, and only once no edition's category still points here —
   * the same guard Creator and Judge apply to their own libraries, for the
   * same reason: a slug still resolving from a past year must keep resolving.
   */
  async remove(id: string, actorId: string, ipAddress?: string) {
    const template = await this.prisma.categoryTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { categories: true } } },
    });
    if (!template) throw new NotFoundException('Category template not found');
    if (template._count.categories > 0) {
      throw new BadRequestException(
        `This category is assigned to ${template._count.categories} edition(s); unassign those first`,
      );
    }

    await this.prisma.categoryTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      userId: actorId,
      action: 'category-template.removed',
      targetType: 'CategoryTemplate',
      targetId: id,
      before: { slug: template.slug, nameLo: template.nameLo },
      ipAddress,
    });
  }

  private async assertSlugFree(slug: string) {
    const clash = await this.prisma.categoryTemplate.findUnique({ where: { slug } });
    if (clash) throw new ConflictException('That slug is already taken');
  }
}
