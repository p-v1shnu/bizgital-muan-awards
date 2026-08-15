import { tryGetPublic } from '@/lib/api/server';
import type { Edition } from '@/types/api';

/**
 * A plain-language map of the site for assistants that read it before
 * answering (the llms.txt convention).
 *
 * The site is written entirely in Lao script, which is most of the reason this
 * file exists: a question asked in English — "who won Muan Awards 2025" —
 * has very little to match against. This says in English what the site is,
 * where each kind of answer lives, and which year is current, so an assistant
 * can find the right page instead of guessing from a URL.
 *
 * It never fails a request. If the API cannot be reached, the year list is
 * simply absent — a map missing one road beats a 500 on a file whose whole
 * purpose is to be readable.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com').replace(/\/$/, '');

export const revalidate = 3600;

export async function GET() {
  const editions = await tryGetPublic<Edition[]>('/editions', { revalidate });
  const years = (editions ?? []).map((edition) => edition.year).sort((a, b) => b - a);

  const body = `# Muan Awards (ມ່ວນ ອະວອດ)

> The annual awards for Lao content creators, run by Muan. Each year has its
> own edition with award categories, nominees, one winner per category, a
> judging panel and sponsors. The site is published in Lao; creator and judge
> names may also carry a Latin-script spelling.

The site is the record of who was nominated and who won, year by year. A
creator's full history — every year they appeared and what they won — is
collected on their own page.

## Pages

- [Home](${SITE}/): what the awards are, the current year, recent winners.
- [Hall of winners](${SITE}/winners): every year that has announced results, newest first.
- [About](${SITE}/about): how the judging works, and frequently asked questions.
- [Send in a name](${SITE}/submit): the public nomination form, open only while a year is accepting entries.

## How the URLs are shaped

- A year: \`${SITE}/awards/<year>\` — for example \`${SITE}/awards/2025\`
- One award category in that year: \`${SITE}/awards/<year>/<category-slug>\`
- One creator, across all years: \`${SITE}/creators/<creator-slug>\`
- \`${SITE}/awards/latest\` always redirects to the most recent published year.

${years.length ? `## Years published\n\n${years.map((year) => `- [${year}](${SITE}/awards/${year})`).join('\n')}\n` : ''}
## Notes

- Nominees and winners are only published once that year has announced them; a
  year still being prepared shows its categories but no names.
- Every page carries schema.org structured data — Event for a year, ItemList
  for a category and for the judging panel, Person for each creator with
  \`sameAs\` links to their own social accounts.
- [Sitemap](${SITE}/sitemap.xml)
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
