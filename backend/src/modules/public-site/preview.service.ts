import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const PREVIEW_TTL_DAYS = 7;

interface PreviewClaims {
  /** Edition this link may open. A token never unlocks more than one year. */
  editionId: string;
  kind: 'preview';
}

/**
 * Preview links for an unpublished year (PRD §4.3.2).
 *
 * The token is a short-lived JWT rather than a database row: there is nothing
 * to clean up when it expires, and nothing to leak if the table is dumped. It
 * is signed with its own secret so a preview link can never be mistaken for an
 * access token, in either direction.
 */
@Injectable()
export class PreviewService {
  constructor(private readonly jwt: JwtService) {}

  private get secret() {
    // Derived rather than configured: one less secret for the team to manage,
    // and rotating JWT_SECRET correctly invalidates outstanding preview links.
    return `${process.env.JWT_SECRET ?? ''}:preview`;
  }

  async mint(editionId: string) {
    const token = await this.jwt.signAsync(
      { editionId, kind: 'preview' } satisfies PreviewClaims,
      { secret: this.secret, expiresIn: `${PREVIEW_TTL_DAYS}d` },
    );
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_DAYS * 24 * 60 * 60 * 1000);
    return { token, expiresAt };
  }

  /** Returns the edition a token unlocks, or null when there is no valid token. */
  async editionFor(token: string | undefined): Promise<string | null> {
    if (!token) return null;
    try {
      const claims = await this.jwt.verifyAsync<PreviewClaims>(token, { secret: this.secret });
      return claims.kind === 'preview' ? claims.editionId : null;
    } catch {
      return null;
    }
  }

  async assertUnlocks(token: string | undefined, editionId: string) {
    const unlocked = await this.editionFor(token);
    if (unlocked !== editionId) throw new UnauthorizedException('Preview link is invalid or expired');
  }
}
