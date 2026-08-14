/**
 * Dates are stored in UTC and always shown in Lao time (PRD §10).
 *
 * `toLocaleDateString` on its own uses the reader's own timezone, which is
 * right for a visitor in Laos and wrong for anyone else — a team member
 * checking the closing date from Bangkok or abroad could see the wrong day.
 * Pinning the zone means everyone reads the same date the event is on.
 */
const ZONE = 'Asia/Vientiane';
const LOCALE = 'lo-LA';

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(LOCALE, {
    timeZone: ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString(LOCALE, {
    timeZone: ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
