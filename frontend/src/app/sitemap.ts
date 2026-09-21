import type { MetadataRoute } from 'next';

import { getPublic } from '@/lib/api/server';

interface SitemapFeed {
  editions: { slug: string; updatedAt: string; categories: string[] }[];
  creators: { slug: string; updatedAt: string }[];
  /** Optional: absent when the API answering this build predates this field. */
  judges?: { slug: string; updatedAt: string }[];
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com').replace(/\/$/, '');

/** Drafts never appear here — the feed itself only returns public years. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE}/submit`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/winners`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: 'yearly', priority: 0.5 },
  ];

  // A sitemap missing its dynamic half beats a build that fails because the
  // API was briefly unreachable.
  const feed = await getPublic<SitemapFeed>('/sitemap-entries', { revalidate: 3600 });
  if (!feed) return staticPages;

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

  // Defensive, not just tidy: a build can reach a backend one deploy behind
  // this frontend image (this field is newer than `creators`), and that
  // backend's /sitemap-entries simply has no `judges` key yet.
  const judgePages = (feed.judges ?? []).map((judge) => ({
    url: `${SITE}/judges/${judge.slug}`,
    lastModified: new Date(judge.updatedAt),
    changeFrequency: 'yearly' as const,
    priority: 0.4,
  }));

  return [...staticPages, ...editionPages, ...creatorPages, ...judgePages];
}
