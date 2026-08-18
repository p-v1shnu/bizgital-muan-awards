/**
 * The tab title and search-result description of the pages that have no record
 * of their own. Same treatment as the homepage cards: only keys the site has are
 * kept, and a blank value is dropped rather than stored, so the page falls back
 * to its own wording.
 *
 * The stakes are a little different here, which is why it is worth being strict:
 * an empty title is not a blank line on a page, it is what a search engine shows
 * for the site.
 */
export const PAGE_SEO_KEYS = ['home', 'about', 'submit', 'winners'] as const;

export type PageSeoKey = (typeof PAGE_SEO_KEYS)[number];
export type PageSeo = { titleLo?: string; descriptionLo?: string };

export function cleanPageSeo(pages?: Partial<Record<PageSeoKey, PageSeo>>) {
  if (!pages) return undefined;
  const out: Record<string, Record<string, string>> = {};
  for (const key of PAGE_SEO_KEYS) {
    const page = pages[key];
    if (!page) continue;
    const kept: Record<string, string> = {};
    for (const field of ['titleLo', 'descriptionLo'] as const) {
      const value = page[field];
      if (typeof value === 'string' && value.trim() !== '') kept[field] = value.trim();
    }
    if (Object.keys(kept).length > 0) out[key] = kept;
  }
  return out;
}
