import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { SetupDto } from './dto/setup.dto';

const BCRYPT_ROUNDS = 12;

/**
 * Wrong passwords are counted per account and address. The global rate limit
 * allows a hundred requests a minute, which is six thousand guesses an hour at
 * the one endpoint where guessing right gets everything — this closes that.
 *
 * The counter lives in memory on purpose: the MVP runs one API container and
 * carries no Redis (PRD §9). A restart forgets the count, which costs an
 * attacker a restart they cannot cause.
 */
const MAX_FAILURES = 8;
const FAILURE_WINDOW_MS = 15 * 60_000;

/** Kept in one place so the cookie maxAge and the token expiry cannot drift apart. */
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly failures = new Map<string, { count: number; firstAt: number }>();

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
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });

    await this.audit.log({
      userId: user.id,
      action: 'admin.setup.completed',
      targetType: 'AdminUser',
      targetId: user.id,
      after: { email: user.email, role: user.role },
      ipAddress,
    });

    const { tokenVersion, ...profile } = user;
    return { user: profile, tokens: await this.issueTokens(user) };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.adminUser.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    const attemptKey = `${dto.email.toLowerCase()}|${ipAddress ?? 'unknown'}`;
    this.assertNotLockedOut(attemptKey);

    // Compare against a dummy hash when the account is missing so that a wrong
    // email and a wrong password take the same amount of time to answer.
    const hash = user?.passwordHash ?? (await bcrypt.hash('no-such-user', 1));
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) {
      const failures = this.recordFailure(attemptKey);
      // A run of these is what an attack looks like from the inside, and the
      // trail held only successes — so nothing anyone could read afterwards
      // said it had happened (OWASP A09:2025). Written against the account
      // when there is one; an unknown address goes to the container log,
      // since the audit table is keyed to a real user.
      if (user) {
        await this.audit.log({
          userId: user.id,
          action: 'admin.login.failed',
          targetType: 'AdminUser',
          targetId: user.id,
          after: { failuresInWindow: failures },
          ipAddress,
        });
      } else {
        this.logger.warn(`Failed sign-in for an unknown address: ${dto.email}`);
      }
      throw new UnauthorizedException('Invalid email or password');
    }
    this.failures.delete(attemptKey);

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
   * Refresh tokens are stateless JWTs signed with a separate secret. Two
   * things can still cancel one: the session id inside it may have been
   * signed out (that browser only), or the account's version may have moved
   * on because the password changed (every browser at once).
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

    const [user, revoked] = await Promise.all([
      this.prisma.adminUser.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true, tokenVersion: true },
      }),
      payload.sid
        ? this.prisma.revokedSession.findUnique({ where: { id: payload.sid } })
        : Promise.resolve(null),
    ]);
    if (!user) throw new UnauthorizedException('Account is no longer active');
    // Two different endings: this session was signed out, or every session was
    // (a password change).
    if (revoked || (payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('This session has been signed out');
    }

    const { tokenVersion, ...profile } = user;
    return { user: profile, tokens: await this.issueTokens(user, payload.sid ?? randomUUID()) };
  }

  /**
   * Ends this one session — the phone signs out, the laptop stays signed in.
   * The note covers the refresh token in the cookie the browser is throwing
   * away and the access token that may still be in flight, so neither can be
   * replayed by whoever might have copied them.
   */
  async logout(userId: string, sessionId: string | undefined, ipAddress?: string) {
    if (sessionId) {
      await this.prisma.revokedSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          userId,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
        },
        update: {},
      });
      // Nothing schedules a cleanup, so each logout clears what has expired.
      await this.prisma.revokedSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    }

    await this.audit.log({
      userId,
      action: 'admin.logout',
      targetType: 'AdminUser',
      targetId: userId,
      ipAddress,
    });
  }

  private async issueTokens(
    user: { id: string; email: string; role: AdminRole; tokenVersion: number },
    /** Kept across refreshes, so signing out cancels the whole chain. */
    sessionId: string = randomUUID(),
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
      sid: sessionId,
    };
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

  private assertNotLockedOut(key: string) {
    const entry = this.failures.get(key);
    if (!entry) return;
    if (Date.now() - entry.firstAt > FAILURE_WINDOW_MS) {
      this.failures.delete(key);
      return;
    }
    if (entry.count >= MAX_FAILURES) {
      this.logger.warn(`Locked out after ${entry.count} failed attempts: ${key}`);
      throw new HttpException(
        'Too many failed sign-in attempts. Try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Returns how many failures this account and address have inside the window. */
  private recordFailure(key: string) {
    const now = Date.now();
    const entry = this.failures.get(key);
    if (!entry || now - entry.firstAt > FAILURE_WINDOW_MS) {
      this.failures.set(key, { count: 1, firstAt: now });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}
