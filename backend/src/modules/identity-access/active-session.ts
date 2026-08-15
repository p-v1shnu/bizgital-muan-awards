import type { AdminRole } from '@prisma/client';

import type { PrismaService } from '../../prisma/prisma.service';

/** What is inside an access token. Kept here because this is what reads it. */
export interface SessionClaims {
  sub: string;
  email?: string;
  role?: AdminRole;
  /** Token version — bumped by a password change, which ends every session. */
  tv?: number;
  /** Session id — one browser, ended by that browser signing out. */
  sid?: string;
}

export interface ActiveSession {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  sessionId?: string;
  /** Carried out so a refresh can re-sign without reading the row again. */
  tokenVersion: number;
}

/**
 * Whether a token that carries a valid signature still stands for a session
 * that exists — and the only place that decides it.
 *
 * A signature proves the token was ours when we made it and nothing more. The
 * three things that end a session leave no mark on it: signing out writes the
 * session id to `revoked_sessions`, changing a password bumps `tokenVersion`,
 * and deleting an account sets `deletedAt`. A token issued before any of those
 * still verifies perfectly.
 *
 * This lived in three places and one of them — the check that let an admin
 * read an unpublished year — only ever verified the signature, so signing out
 * did not close it. Fifteen minutes of a token that should already have been
 * dead, against pages holding the winners before they are announced.
 */
export async function loadActiveSession(
  prisma: PrismaService,
  payload: SessionClaims,
): Promise<ActiveSession | null> {
  const [user, revoked] = await Promise.all([
    prisma.adminUser.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    }),
    payload.sid
      ? prisma.revokedSession.findUnique({ where: { id: payload.sid }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!user) return null;
  if (revoked || (payload.tv ?? 0) !== user.tokenVersion) return null;

  return { ...user, sessionId: payload.sid };
}
