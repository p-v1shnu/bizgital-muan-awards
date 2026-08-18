/**
 * Trims every field of every entry in a list the back office sent, and drops an
 * entry with a blank one.
 *
 * Both lists on SiteSetting work this way — the FAQ and the judging steps — and
 * both have the same failure to avoid: a row the team added and then left alone
 * would otherwise be stored as empty text and reach the page as a heading with
 * nothing under it. The DTO already refuses a missing or oversized field, so
 * this is about the shape a form produces, not a hostile payload. Order is the
 * array's own, which is what the editor's arrows move entries around in.
 */
export function cleanEntries<T extends object>(entries?: T[]): Record<string, string>[] | undefined {
  if (!entries) return undefined;
  return entries
    .map((entry) =>
      Object.fromEntries(
        Object.entries(entry).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : String(value),
        ]),
      ),
    )
    .filter((entry) => Object.values(entry).every((value) => value !== ''));
}
