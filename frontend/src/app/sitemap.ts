import type { MetadataRoute } from 'next';

import { apiFetch } from '@/lib/api/client';

interface SitemapFeed {
  editions: { slug: string; updatedAt: string; categories: string[] }[];
  creators: { slug: string; updatedAt: string }[];
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com').replace(/\/$/, '');

/** Drafts never appear here — the feed itself only returns public years. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE}/awards`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/winners`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: 'yearly', priority: 0.5 },
  ];

  let feed: SitemapFeed;
  try {
    feed = await apiFetch<SitemapFeed>('/sitemap-entries', { revalidate: 3600 });
  } catch {
    // A sitemap missing its dynamic half beats a build that fails because the
    // API was briefly unreachable.
    return staticPages;
  }

  const editionPages = feed.editions.flatMap((edition) => [
    {
      url: `${SITE}/awards/${edition.slug}`,
      lastModified: new Date(edition.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    ...edition.categories.map((category) => ({
      url: `${SITE}/awards/${edition.slug}/${category}`,
      lastModified: new Date(edition.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]);

  const creatorPages = feed.creators.map((creator) => ({
    url: `${SITE}/creators/${creator.slug}`,
    lastModified: new Date(creator.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...editionPages, ...creatorPages];
}
