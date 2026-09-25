import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { verify } from 'jsonwebtoken';
import type { Request } from 'express';

import { clientNetwork } from '../utils/client-network';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';
export const VISITOR_IP_HEADER = 'x-visitor-ip';

/** True when the request comes from the site's own server, proven by the shared secret. */
function fromSite(request: Request) {
  const expected = process.env.INTERNAL_API_SECRET;
  const given = request.headers[INTERNAL_SECRET_HEADER];
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The visitor the site's server is asking for. Only meaningful when fromSite() holds. */
function visitorOf(request: Request) {
  const value = request.headers[VISITOR_IP_HEADER];
  return typeof value === 'string' && isIP(value) ? value : undefined;
}

/**
 * The rate limit exists to keep strangers from hammering the public side. It
 * was also counting the back office, where a hundred requests a minute is not
 * a lot: one click in the nominee tab fires the write plus two list refreshes,
 * and the team enters hundreds of rows during a backfill (PRD §7.5) — they
 * would have been throttled doing exactly the work the tool is for.
 *
 * So signed-in work is skipped. What decides "signed in" is the point: it used
 * to be the path, and this guard runs *before* the one that checks tokens — so
 * anyone at all could hold `/api/v1/admin/…` open with no ceiling and collect
 * 401s as fast as the server could produce them. The address of the request
 * makes no difference to that; a bad token does.
 *
 * Only the signature is checked here, not the session behind it. That is
 * deliberate: it costs no database round trip, it cannot be forged without the
 * secret, and the guard immediately after this one does the rest. The question
 * being asked is "is this plausibly the team", not "is this person allowed".
 */
@Injectable()
export class PublicThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // The site's own server renders every visitor's page from one address, so
    // counting it as one client let anyone fill that bucket and take every
    // page down. Its cached reads are skipped; reads it makes on a visitor's
    // behalf are counted against that visitor (see getTracker).
    if (fromSite(request) && !visitorOf(request)) return true;

    if (!request.path.startsWith('/api/v1/admin/')) return false;

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return false;

    try {
      verify(header.slice(7), process.env.JWT_SECRET as string);
      return true;
    } catch {
      return false;
    }
  }

  protected async getTracker(request: Record<string, unknown>): Promise<string> {
    const req = request as unknown as Request;
    const address = (fromSite(req) && visitorOf(req)) || req.ip;
    return clientNetwork(address) ?? 'unknown';
  }

  /**
   * The person who runs into this is usually not the person it was built for.
   * Mobile networks in Laos put a great many subscribers behind one public
   * address, so the limit is shared by strangers: measured against a single
   * address, the eleventh entry was refused and the sender was shown
   * "ThrottlerException: Too Many Requests" — naming a class, which tells them
   * nothing about what to do.
   *
   * English on the owner's instruction: every message on a failure path in this
   * project is, because a failure is by definition the one thing nobody sees
   * during a review, and unreviewed Lao is worse than plain English. Everything
   * a visitor meets in ordinary use stays in Lao.
   */
  protected async getErrorMessage(): Promise<string> {
    return 'Too many entries from this connection. Mobile networks share one address between many people — please wait a while and try again, or switch to Wi-Fi.';
  }
}
