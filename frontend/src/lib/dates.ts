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

/**
 * Laos keeps UTC+7 all year — no daylight saving — so the offset is a constant
 * rather than something to look up.
 */
const OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * `<input type="datetime-local">` speaks wall-clock with no zone attached, and
 * the browser resolves it against *its own* clock. The closing time of the form
 * is a Lao time whoever types it: a team member in Bangkok, or one abroad, or a
 * laptop with the wrong zone set must all mean the same instant. These two
 * convert against Vientiane explicitly instead.
 */
export function toVientianeInput(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

export function fromVientianeInput(value: string) {
  if (!value) return null;
  return new Date(new Date(`${value}:00.000Z`).getTime() - OFFSET_MS).toISOString();
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
