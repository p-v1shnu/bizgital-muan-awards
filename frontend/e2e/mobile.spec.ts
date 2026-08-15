import { expect, test } from '@playwright/test';

/**
 * Each spec file signs in from its own address.
 *
 * `/auth/login` allows twenty attempts a minute from one address — a
 * deliberate bound on password guessing (PRD §8). Every test here signs in for
 * itself, and run together with the seed's own sign-ins that crosses twenty
 * inside a minute, so the suite began throttling itself: the last two or three
 * tests failed, never the same ones twice, and passed whenever they were run
 * alone. The API trusts X-Forwarded-For from loopback, so giving each file its
 * own address restores the separation the limit assumes without touching the
 * limit.
 */
test.use({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.13' } });

/**
 * Most visitors arrive from Facebook on a phone (PRD §10), and the failure
 * that ruins that experience is a page that scrolls sideways — usually one
 * wide element nobody noticed on a laptop.
 */
test('no public page scrolls sideways on a phone', async ({ page }) => {
  for (const route of [
    '/',
    '/awards/2025',
    '/awards/2026',
    '/awards/2025/creator-of-the-year',
    '/winners',
    '/submit',
    '/about',
    '/creators/khamla',
  ]) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});

test('the year switcher scrolls inside itself rather than widening the page', async ({ page }) => {
  await page.goto('/awards/2025');
  const nav = page.locator('nav[aria-label="ເລືອກປີ"] > div');
  await expect(nav).toHaveCSS('overflow-x', 'auto');
});
