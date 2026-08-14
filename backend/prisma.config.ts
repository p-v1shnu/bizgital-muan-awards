import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Replaces the deprecated `prisma` key in package.json, which Prisma 7 drops.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
