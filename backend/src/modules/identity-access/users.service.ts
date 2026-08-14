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
    if (await this.prisma.adminUser.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException('Email is already registered');
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

    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
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
