import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The back office has nothing for a crawler, and a preview link should
      // never end up in an index.
      disallow: ['/admin', '/admin/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
