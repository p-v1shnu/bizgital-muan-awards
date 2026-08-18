import { getPublic } from '@/lib/api/server';
import type { SiteSettings } from '@/types/api';

/**
 * The tab title and search-result description of a page with no record of its
 * own, as the team writes them in /admin/site.
 *
 * Always falls back to the words passed in, which are the ones the page used to
 * carry. An empty title is not a blank line somewhere on a page — it is what a
 * search engine prints for the site — so a field the team clears has to land on
 * something rather than nothing. The read is the same cached one the page body
 * does, so this costs no extra request.
 */
export async function pageSeo(
  key: 'home' | 'about' | 'submit' | 'winners',
  fallback: { title: string; description: string },
) {
  const site = await getPublic<SiteSettings>('/site');
  const copy = site?.pageSeo?.[key];
  return {
    title: copy?.titleLo?.trim() || fallback.title,
    description: copy?.descriptionLo?.trim() || fallback.description,
  };
}
