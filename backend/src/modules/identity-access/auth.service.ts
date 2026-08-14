import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { SetupDto } from './dto/setup.dto';

const BCRYPT_ROUNDS = 12;

/** Kept in one place so the cookie maxAge and the token expiry cannot drift apart. */
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  /**
   * True while the site has no SUPER_ADMIN and SETUP_ENABLED is on.
   * The frontend calls this to decide between /setup and /login.
   */
  async setupState() {
    const superAdmins = await this.prisma.adminUser.count({
      where: { role: AdminRole.SUPER_ADMIN, deletedAt: null },
    });
    return {
      needsSetup: superAdmins === 0 && process.env.SETUP_ENABLED === 'true',
      hasSuperAdmin: superAdmins > 0,
    };
  }

  /** One-time creation of the first SUPER_ADMIN. Guarded twice: by the flag and by the count. */
  async setup(dto: SetupDto, ipAddress?: string) {
    if (process.env.SETUP_ENABLED !== 'true') {
      throw new ForbiddenException('Setup is disabled');
    }
    const existing = await this.prisma.adminUser.count({
      where: { role: AdminRole.SUPER_ADMIN, deletedAt: null },
    });
    if (existing > 0) {
      throw new ForbiddenException('A super admin already exists');
    }
    if (await this.prisma.adminUser.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: AdminRole.SUPER_ADMIN,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.audit.log({
      userId: user.id,
      action: 'admin.setup.completed',
      targetType: 'AdminUser',
      targetId: user.id,
      after: { email: user.email, role: user.role },
      ipAddress,
    });

    return { user, tokens: await this.issueTokens(user) };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.adminUser.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    // Compare against a dummy hash when the account is missing so that a wrong
    // email and a wrong password take the same amount of time to answer.
    const hash = user?.passwordHash ?? (await bcrypt.hash('no-such-user', 1));
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      userId: user.id,
      action: 'admin.login',
      targetType: 'AdminUser',
      targetId: user.id,
      ipAddress,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens: await this.issueTokens(user),
    };
  }

  /**
   * Refresh tokens are stateless JWTs signed with a separate secret. The PRD
   * (§8) keeps no session table, so logout clears the cookie rather than
   * revoking server-side; the short access-token TTL bounds the exposure.
   */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.adminUser.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Account is no longer active');

    return { user, tokens: await this.issueTokens(user) };
  }

  async logout(userId: string, ipAddress?: string) {
    await this.audit.log({
      userId,
      action: 'admin.logout',
      targetType: 'AdminUser',
      targetId: userId,
      ipAddress,
    });
  }

  private async issueTokens(user: { id: string; email: string; role: AdminRole }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
