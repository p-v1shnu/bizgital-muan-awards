import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JudgeRole, Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignJudgeDto, CreateJudgeDto, UpdateAssignmentDto, UpdateJudgeDto } from './dto/judge.dto';

@Injectable()
export class JudgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── the library ─────────────────────────────────────────────

  async list(query: PaginationDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    const where: Prisma.JudgeWhereInput = {
      deletedAt: null,
      ...(query.q ? { OR: [{ nameLo: { contains: query.q } }, { nameEn: { contains: query.q } }] } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.judge.findMany({
        where,
        orderBy: { nameLo: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { editions: true } } },
      }),
      this.prisma.judge.count({ where }),
    ]);
    return paginate(data, total, page, perPage);
  }

  async create(dto: CreateJudgeDto, actorId: string, ipAddress?: string) {
    const judge = await this.prisma.judge.create({ data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'judge.created',
      targetType: 'Judge',
      targetId: judge.id,
      after: { nameLo: judge.nameLo },
      ipAddress,
    });
    return judge;
  }

  async update(id: string, dto: UpdateJudgeDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.judge.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Judge not found');

    const after = await this.prisma.judge.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actorId,
      action: 'judge.updated',
      targetType: 'Judge',
      targetId: id,
      before,
      after,
      ipAddress,
    });
    return after;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const judge = await this.prisma.judge.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { editions: true } } },
    });
    if (!judge) throw new NotFoundException('Judge not found');
    if (judge._count.editions > 0) {
      throw new BadRequestException(
        `This judge is assigned to ${judge._count.editions} edition(s); unassign them first`,
      );
    }

    await this.prisma.judge.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      userId: actorId,
      action: 'judge.removed',
      targetType: 'Judge',
      targetId: id,
      before: { nameLo: judge.nameLo },
      ipAddress,
    });
  }

  // ── per-year assignments ────────────────────────────────────

  listForEdition(editionId: string) {
    return this.prisma.editionJudge.findMany({
      where: { editionId },
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
      include: { judge: true },
    });
  }

  async assign(editionId: string, dto: AssignJudgeDto, actorId: string, ipAddress?: string) {
    const [edition, judge] = await Promise.all([
      this.prisma.edition.findUnique({ where: { id: editionId } }),
      this.prisma.judge.findFirst({ where: { id: dto.judgeId, deletedAt: null } }),
    ]);
    if (!edition) throw new NotFoundException('Edition not found');
    if (!judge) throw new NotFoundException('Judge not found');

    const already = await this.prisma.editionJudge.findUnique({
      where: { editionId_judgeId: { editionId, judgeId: dto.judgeId } },
    });
    if (already) throw new ConflictException('That judge is already on this edition');

    const last = await this.prisma.editionJudge.findFirst({
      where: { editionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const assignment = await this.prisma.editionJudge.create({
      data: {
        editionId,
        judgeId: dto.judgeId,
        role: dto.role ?? JudgeRole.MEMBER,
        sortOrder: dto.sortOrder ?? (last?.sortOrder ?? -1) + 1,
      },
      include: { judge: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'judge.assigned',
      targetType: 'Edition',
      targetId: editionId,
      after: { judgeId: dto.judgeId, nameLo: judge.nameLo, role: assignment.role },
      ipAddress,
    });
    return assignment;
  }

  async updateAssignment(id: string, dto: UpdateAssignmentDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.editionJudge.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Assignment not found');

    const after = await this.prisma.editionJudge.update({
      where: { id },
      data: dto,
      include: { judge: true },
    });
    await this.audit.log({
      userId: actorId,
      action: 'judge.assignment.updated',
      targetType: 'Edition',
      targetId: before.editionId,
      before: { role: before.role, sortOrder: before.sortOrder },
      after: { role: after.role, sortOrder: after.sortOrder },
      ipAddress,
    });
    return after;
  }

  async unassign(id: string, actorId: string, ipAddress?: string) {
    const assignment = await this.prisma.editionJudge.findUnique({
      where: { id },
      include: { judge: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.prisma.editionJudge.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'judge.unassigned',
      targetType: 'Edition',
      targetId: assignment.editionId,
      before: { judgeId: assignment.judgeId, nameLo: assignment.judge.nameLo },
      ipAddress,
    });
  }
}
