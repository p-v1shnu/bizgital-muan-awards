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

/**
 * The header on a phone. Laid out as a row it wrapped onto two lines — three
 * Lao labels, the site name and the "send a name" button do not fit across
 * 400px — and the fix before this one was to hide "ກ່ຽວກັບງານ" below `sm`,
 * which made the page unreachable from the header rather than making it fit.
 *
 * So: one line, and every destination still reachable.
 */
test('the header is one line on a phone, with every destination behind the menu', async ({
  page,
}) => {
  await page.goto('/');
  const bar = page.locator('header > div');

  // One line: a wrapped flex row is taller than the row it should be. The bar
  // is padded 12px top and bottom around a 32px lockup, so a second line puts
  // it well past 80px.
  const height = await bar.evaluate((element) => element.getBoundingClientRect().height);
  expect(height, `header is ${height}px tall, which is more than one row`).toBeLessThan(80);

  // The invitation stays in the bar rather than going behind the button.
  await expect(bar.getByRole('link', { name: 'ສົ່ງລາຍຊື່' })).toBeVisible();

  const menu = page.getByRole('button', { name: 'ເປີດເມນູ' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();

  const panel = page.locator('#site-menu');
  await expect(panel.getByRole('link', { name: 'ງານປີ 2026' })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'ທຳນຽບຜູ້ຊະນະ' })).toBeVisible();
  await panel.getByRole('link', { name: 'ກ່ຽວກັບງານ' }).click();

  await expect(page).toHaveURL(/\/about$/);
  // And the panel is not still hanging over the page it just opened: the header
  // is in the layout, so nothing remounts it on a navigation.
  await expect(panel).toBeHidden();
});
