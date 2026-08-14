import type { NextConfig } from 'next';

/**
 * The site keeps its existing domain, so every URL people have already shared
 * has to keep working (PRD §9). These are permanent moves, not temporary ones,
 * so search engines pass the accumulated ranking on to the new address.
 */
const LEGACY_REDIRECTS = [
  { source: '/muan/our-projects', destination: '/winners' },
  { source: '/muan/about-us', destination: '/about' },
  { source: '/muan/faq', destination: '/about' },
  { source: '/muan/contact', destination: '/about' },
  // The old site nested everything under /muan; anything else there belongs
  // on the homepage rather than at a dead end.
  { source: '/muan', destination: '/' },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Runs behind Caddy in production; Docker needs the standalone bundle.
  output: 'standalone',
  images: {
    // Images live in object storage (MinIO locally, Spaces in production).
    remotePatterns: process.env.NEXT_PUBLIC_IMAGE_HOST
      ? [{ protocol: 'https', hostname: process.env.NEXT_PUBLIC_IMAGE_HOST }]
      : [{ protocol: 'http', hostname: 'localhost' }],
  },
  async redirects() {
    // 301 rather than Next's default 308 for `permanent: true`. Search engines
    // treat the two the same, but §9 of the PRD names 301 and every SEO check
    // the team runs will look for that number.
    return LEGACY_REDIRECTS.map((rule) => ({ ...rule, statusCode: 301 as const }));
  },
};

export default config;
