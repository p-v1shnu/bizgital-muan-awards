import { Controller, Get, Query } from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

export class ListAuditDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'edition.phase.changed' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'Edition' })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

@ApiTags('audit-admin')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  // The trail records who did what; only a super admin gets to read it back.
  @Roles(AdminRole.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Every recorded change, newest first' })
  async list(@Query() query: ListAuditDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(data, total, page, perPage);
  }
}
