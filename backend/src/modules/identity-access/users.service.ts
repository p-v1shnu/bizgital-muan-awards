import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

const BCRYPT_ROUNDS = 12;

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.adminUser.findMany({
      where: { deletedAt: null },
      select: PUBLIC_FIELDS,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateAdminUserDto, actorId: string, ipAddress?: string) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Email is already registered');
    }
    // A removed account keeps its row — the audit trail points at it — and so
    // keeps its address on the unique index. Refusing the address on that
    // basis made removal permanent for the *person*: someone who left and
    // came back, or was removed by mistake, could never be added again under
    // the address they actually use, and the only answer was to invent a
    // second one. Reviving the row restores the account instead, with a new
    // password, the role chosen now, and its history intact.
    if (existing) {
      const revived = await this.prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          name: dto.name,
          role: dto.role ?? AdminRole.ADMIN,
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
          // Anything still signed in as the old account stops working: the
          // tokens it holds were issued before the removal.
          tokenVersion: { increment: 1 },
        },
        select: PUBLIC_FIELDS,
      });
      await this.audit.log({
        userId: actorId,
        action: 'admin.user.restored',
        targetType: 'AdminUser',
        targetId: revived.id,
        after: { email: revived.email, role: revived.role },
        ipAddress,
      });
      return revived;
    }

    const user = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: dto.role ?? AdminRole.ADMIN,
      },
      select: PUBLIC_FIELDS,
    });

    await this.audit.log({
      userId: actorId,
      action: 'admin.user.created',
      targetType: 'AdminUser',
      targetId: user.id,
      after: { email: user.email, role: user.role },
      ipAddress,
    });
    return user;
  }

  /**
   * Soft delete. The last remaining SUPER_ADMIN is protected so the site can
   * never end up with nobody able to manage users.
   */
  async remove(id: string, actorId: string, ipAddress?: string) {
    if (id === actorId) throw new ForbiddenException('You cannot remove your own account');

    const user = await this.prisma.adminUser.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Admin user not found');

    if (user.role === AdminRole.SUPER_ADMIN) {
      const remaining = await this.prisma.adminUser.count({
        where: { role: AdminRole.SUPER_ADMIN, deletedAt: null },
      });
      if (remaining <= 1) throw new ForbiddenException('The last super admin cannot be removed');
    }

    await this.prisma.adminUser.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      userId: actorId,
      action: 'admin.user.removed',
      targetType: 'AdminUser',
      targetId: id,
      before: { email: user.email, role: user.role },
      ipAddress,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string) {
    const user = await this.prisma.adminUser.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('Admin user not found');

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Bumping the version signs out every other browser holding a token for
    // this account — which is the point of changing a password in a hurry.
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
        tokenVersion: { increment: 1 },
      },
    });
    await this.audit.log({
      userId,
      action: 'admin.password.changed',
      targetType: 'AdminUser',
      targetId: userId,
      ipAddress,
    });
  }
}
