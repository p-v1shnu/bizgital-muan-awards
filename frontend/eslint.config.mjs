import next from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * `next lint` was removed in Next 16, and the script in package.json outlived
 * it: for a while `npm run lint` failed outright, so the four
 * `eslint-disable-next-line` comments in this codebase were addressed to
 * nobody. This is that command put back — the same rule sets Next ships
 * (`core-web-vitals` plus typescript-eslint's recommended), wired up as flat
 * config, which is the only shape ESLint 9 reads.
 */
const config = [
  {
    ignores: [
      '.next/**',
      'next-env.d.ts',
      // Playwright's own output, written on every failing run.
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...next,
  ...typescript,
];

export default config;
