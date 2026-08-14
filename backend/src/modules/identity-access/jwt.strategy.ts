import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
  /** Session generation — bumped by a password change, which ends every session. */
  tv?: number;
  /** This browser's session, so signing out here leaves other browsers alone. */
  sid?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * The token is re-checked against the database on every request so that a
   * disabled or deleted admin loses access immediately instead of at expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // `name` is included because the admin shell reads the session from
    // /auth/me after a reload, and the sidebar shows who is signed in.
    const [user, revoked] = await Promise.all([
      this.prisma.adminUser.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true, tokenVersion: true },
      }),
      payload.sid
        ? this.prisma.revokedSession.findUnique({ where: { id: payload.sid }, select: { id: true } })
        : Promise.resolve(null),
    ]);
    if (!user) throw new UnauthorizedException('Account is no longer active');
    // Either this session was signed out, or the password changed and took
    // every session with it.
    if (revoked || (payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('This session has been signed out');
    }

    const { tokenVersion, ...profile } = user;
    return { ...profile, sessionId: payload.sid };
  }
}
