import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { loadActiveSession } from './active-session';

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
   * `loadActiveSession` is that check, shared with the public routes so the two
   * cannot drift apart again.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await loadActiveSession(this.prisma, payload);
    if (!session) throw new UnauthorizedException('This session is no longer active');
    // The version stays out of what the rest of the request sees: it is a fact
    // about the token, not about the person.
    const { tokenVersion, ...user } = session;
    return user;
  }
}
