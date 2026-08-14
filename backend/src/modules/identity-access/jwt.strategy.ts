import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
  /** Session generation — see AuthService. Absent on tokens issued before it existed. */
  tv?: number;
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
    const user = await this.prisma.adminUser.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException('Account is no longer active');
    // Signing out elsewhere, or changing the password, ends this token too.
    if ((payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('This session has been signed out');
    }

    const { tokenVersion, ...profile } = user;
    return profile;
  }
}
