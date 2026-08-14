import type { NextConfig } from 'next';

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
};

export default config;
