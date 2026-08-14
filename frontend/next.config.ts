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

const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

function imageHosts(): NonNullable<NextConfig['images']>['remotePatterns'] {
  if (!IMAGE_BASE) {
    // Local development against MinIO on the host.
    return [{ protocol: 'http', hostname: 'localhost' }, { protocol: 'http', hostname: '127.0.0.1' }];
  }
  try {
    const url = new URL(IMAGE_BASE);
    return [
      {
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        port: url.port || undefined,
      },
    ];
  } catch {
    return [];
  }
}

/**
 * Next refuses to fetch an image from a private address, because on a normal
 * deployment that would mean someone had talked the optimiser into reading
 * something on the internal network.
 *
 * Our storage genuinely is on the internal network in two setups — MinIO on
 * localhost in development, and the `minio` service inside Compose — so the
 * guard has to be lifted there or every picture arrives unoptimised. It is
 * lifted only when the configured host is plainly local: a real deployment
 * points at a CDN domain, which has dots in it and is left protected.
 */
function storageIsLocal() {
  if (!IMAGE_BASE) return true;
  try {
    const { hostname } = new URL(IMAGE_BASE);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      // A single-label name is a container on the Compose network.
      !hostname.includes('.')
    );
  } catch {
    return false;
  }
}

const config: NextConfig = {
  reactStrictMode: true,
  // Runs behind Caddy in production; Docker needs the standalone bundle.
  output: 'standalone',
  images: {
    // Pictures live in object storage — MinIO locally, Spaces in production —
    // so the host is derived from the same variable that builds their URLs
    // rather than configured twice and left to drift apart.
    remotePatterns: imageHosts(),
    dangerouslyAllowLocalIP: storageIsLocal(),
    // Lao mobile first: these are the widths actually requested by the layouts.
    imageSizes: [64, 112, 200, 300, 380],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    // 301 rather than Next's default 308 for `permanent: true`. Search engines
    // treat the two the same, but §9 of the PRD names 301 and every SEO check
    // the team runs will look for that number.
    return LEGACY_REDIRECTS.map((rule) => ({ ...rule, statusCode: 301 as const }));
  },
};

export default config;
