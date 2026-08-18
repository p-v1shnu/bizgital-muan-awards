/**
 * The homepage card copy, keyed by the state the site is in. Unlike the FAQ and
 * the judging steps, the keys are the system's — the team owns the words, not the
 * set of states — so anything it does not recognise is dropped rather than stored
 * as a card nothing will ever render.
 *
 * A blank value is dropped too, which is what makes it fall back to the page's
 * own wording: the alternative is an empty heading on the homepage.
 */
export const HOME_CARD_KEYS = [
  'noYear',
  'draft',
  'published',
  'nominees',
  'winners',
  'entriesOpen',
  'hallOfWinners',
] as const;

export type HomeCardKey = (typeof HOME_CARD_KEYS)[number];
export type HomeCard = { titleLo?: string; bodyLo?: string };

export function cleanHomeCards(cards?: Partial<Record<HomeCardKey, HomeCard>>) {
  if (!cards) return undefined;
  const out: Record<string, Record<string, string>> = {};
  for (const key of HOME_CARD_KEYS) {
    const card = cards[key];
    if (!card) continue;
    const kept: Record<string, string> = {};
    for (const field of ['titleLo', 'bodyLo'] as const) {
      const value = card[field];
      if (typeof value === 'string' && value.trim() !== '') kept[field] = value.trim();
    }
    if (Object.keys(kept).length > 0) out[key] = kept;
  }
  return out;
}
