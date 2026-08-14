import { defineConfig, devices } from '@playwright/test';

/**
 * The browser pass. It runs against a running API and site rather than mocks,
 * because the things worth checking here — what a phase reveals, whether a
 * card is painted over, whether Lao text picks up a Lao font — only exist once
 * real data has been through a real browser.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // the specs seed and read one shared database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Some environments ship a browser rather than letting Playwright fetch
    // its own; point at it instead of failing with "run playwright install".
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },

  /**
   * The site and the API must look like one site to the browser, or the
   * refresh cookie is cross-site and SameSite=Lax drops it — so E2E_BASE_URL
   * and E2E_API_URL have to share a hostname. Production serves both from one
   * domain through Caddy, so this mirrors the real arrangement.
   */
  globalSetup: './e2e/seed.ts',

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Most visitors arrive from Facebook on a phone (PRD §10).
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
});
