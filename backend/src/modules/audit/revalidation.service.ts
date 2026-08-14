import { Injectable, Logger } from '@nestjs/common';

/**
 * Tells the site to drop its cached pages after a change, so a visitor sees
 * the result of "announce winners" straight away instead of up to a minute
 * later (PRD §9).
 *
 * Deliberately fire-and-forget: a stale page for one more minute is a small
 * problem, and an admin save that fails because the web container was
 * restarting is a bigger one.
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  /** Actions that change nothing a visitor can see. */
  private static readonly IGNORED = ['admin.login', 'admin.logout', 'admin.password.changed'];

  trigger(action: string) {
    if (RevalidationService.IGNORED.includes(action)) return;

    const url = process.env.REVALIDATE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!url || !secret) return;

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ reason: action }),
      signal: AbortSignal.timeout(3000),
    }).catch((error: unknown) => {
      this.logger.warn(
        `Could not refresh the site after ${action}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
}
