import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the address only if it is one a browser may follow safely.
 *
 * Rows written before the API validated them — or by a back-office account in
 * someone else's hands — can still hold a `javascript:` link, and React puts
 * whatever it is given into an href. Anything that is not http(s) becomes no
 * link at all (OWASP A05:2025).
 */
export function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/**
 * What an emptied field has to be sent as, for a saved value to be removable.
 *
 * These forms used to send `undefined` for a box the team had cleared. That is
 * not "no value" on the way to the database — `JSON.stringify` drops the key
 * entirely, so the field never reaches the API, and Prisma reads a missing
 * field as "leave this column alone". The result was a one-way door: a ticket
 * link could be added and never taken away, so the "buy tickets" button stayed
 * on a year that finished months ago, pointing at a page that no longer sells
 * anything — the dead link PRD §7.4 exists to prevent. The same for the venue,
 * the date, the hero image and a category's group heading.
 *
 * `null` is the difference. It survives the encoding and Prisma writes it.
 */
export function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * What a slug field does to whatever lands in it, typed or pasted — so a
 * title copied from somewhere else ("Creator Of The Year") becomes something
 * the slug pattern (`[a-z0-9-]+`) already accepts, instead of tripping it and
 * leaving the team to fix it by hand.
 */
export function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-');
}
