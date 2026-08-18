/**
 * How many 5xx responses this process has sent, in one-minute buckets.
 *
 * The gap this closes (monitoring.md §6): an external watcher sees the site
 * answering and calls it healthy, while every attempt to send in a name fails
 * with a 500. Uptime checks cannot see that — the pages they fetch are fine.
 *
 * Kept as a module-level counter rather than an injectable service because the
 * global exception filter is constructed by hand in `bootstrap.ts`, so nothing
 * can be injected into it, and this has to be counted where the errors already
 * pass through. It is deliberately process-local: `docker-compose.yml` runs one
 * API container (PRD §9 — no worker, no Redis), and a number that needs a shared
 * store to be meaningful would be a reason to add one.
 *
 * Restarting the API forgets the count. That is the right behaviour for what
 * this watches — a spike is happening now or it is not — and a restart is
 * itself the usual answer to one.
 */

/** The window the health endpoint reports on, and the widest history kept. */
export const SERVER_ERROR_WINDOW_MINUTES = 5;

const buckets = new Map<number, number>();

function minuteOf(at: number) {
  return Math.floor(at / 60_000);
}

/** Drops buckets that have fallen out of the window, so this cannot grow. */
function prune(now: number) {
  const oldest = minuteOf(now) - SERVER_ERROR_WINDOW_MINUTES;
  for (const minute of buckets.keys()) {
    if (minute <= oldest) buckets.delete(minute);
  }
}

/** Called for every response the filter sends with a 5xx status. */
export function recordServerError(now: number = Date.now()) {
  prune(now);
  const minute = minuteOf(now);
  buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
}

/** How many 5xx went out inside the window ending now. */
export function serverErrorsInWindow(now: number = Date.now()) {
  prune(now);
  let total = 0;
  for (const count of buckets.values()) total += count;
  return total;
}

/** Test seam: the suite runs in one process and shares this counter. */
export function resetServerErrors() {
  buckets.clear();
}
