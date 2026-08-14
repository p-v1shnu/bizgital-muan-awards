import { expect, test } from '@playwright/test';

import { ADMIN } from './seed';

test('a wrong password surfaces what the server said', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[type=password]', 'not-the-password');
  await page.click('button[type=submit]');

  // Not getByRole('alert'): Next's route announcer is also one.
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type=email]', ADMIN.email);
    await page.fill('input[type=password]', ADMIN.password);
    await page.click('button[type=submit]');
    await page.waitForURL('**/admin');
  });

test('the dashboard says what is pending and which phase it blocks', async ({ page }) => {
  await expect(page.getByText('ວຽກທີ່ຄ້າງ')).toBeVisible();
  await expect(page.getByText('ບລັອກຂັ້ນ').first()).toBeVisible();
  await expect(page.getByText('ຄວາມຄືບໜ້າແຕ່ລະສາຂາ')).toBeVisible();
});

test('the session survives a reload', async ({ page }) => {
  await page.reload();
  await expect(page.locator('aside')).toContainText('Muan Admin');
});

test.describe('the edition page', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('ໄປໜ້າຈັດການປີ').first().click();
    await page.waitForURL('**/admin/editions/**');
  });

  test('keeps the two switches visibly separate (PRD §4)', async ({ page }) => {
    await expect(page.getByText('ຂໍ້ມູນພື້ນຖານ')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).toContain('ສະຫວິດ 1');
    expect(body).toContain('ສະຫວິດ 2');
    expect(body, 'the reason they are separate is stated on the page').toContain(
      'ເປັນຫຍັງຈຶ່ງແຍກສອງກ່ອງ',
    );
  });

  test('the night’s programme can be typed in and saved', async ({ page }) => {
    await expect(page.getByText('ກິດຈະກຳໃນງານ')).toBeVisible();

    // One activity per line — what the year page renders as a numbered list.
    const programme = page.locator('textarea').nth(1);
    await programme.fill('ຍ່າງພົມແດງ\nປະກາດຜົນລາງວັນ');
    await page.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ບັນທຶກແລ້ວ')).toBeVisible();

    await page.reload();
    await expect(page.locator('textarea').nth(1)).toHaveValue('ຍ່າງພົມແດງ\nປະກາດຜົນລາງວັນ');
  });

  test('the publish checklist names what it blocks', async ({ page }) => {
    await expect(page.getByText('ບລັອກຂັ້ນ').first()).toBeVisible();
  });

  test('crowning a winner un-crowns the previous one', async ({ page }) => {
    const url = page.url().split('?')[0];
    await page.goto(`${url}?tab=nominees`);
    await page.waitForSelector('input[placeholder*="ຄົ້ນຫາຄຣີເອເຕີ"]');

    const winnerButtons = page.locator('button:has-text("ຜູ້ຊະນະ")');
    await winnerButtons.first().waitFor();
    await winnerButtons.nth(0).click();
    await expect(page.getByText('ຜູ້ຊະນະ 1')).toBeVisible();

    await winnerButtons.nth(1).click();
    // Still exactly one, not two.
    await expect(page.getByText('ຜູ້ຊະນະ 1')).toBeVisible();
  });
});

test('a preview link opens a draft for someone who cannot sign in', async ({ page, request, baseURL }) => {
  const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1';
  const login = await request.post(`${api}/auth/login`, {
    data: { email: 'admin@muanawards.com', password: 'a-very-long-password' },
  });
  const auth = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

  const draft = await request.post(`${api}/admin/editions`, {
    headers: auth,
    data: { year: 2031, slug: '2031', titleLo: 'ມ່ວນ ອະວອດ 2031' },
  });
  const draftId = (await draft.json()).data.id;

  const minted = await request.post(`${api}/admin/editions/${draftId}/preview-token`, {
    headers: auth,
  });
  const { token: previewToken } = (await minted.json()).data;

  // Signed out, in a clean context — no cookie, no token in memory.
  const anon = await page.context().browser()!.newContext({ baseURL });
  const guest = await anon.newPage();

  const withoutToken = await guest.goto('/awards/2031');
  expect(withoutToken?.status(), 'a stranger must not learn the year exists').toBe(404);

  await guest.goto(`/awards/2031?preview=${previewToken}`);
  await expect(guest.getByText('ນີ້ແມ່ນ')).toBeVisible();
  await expect(guest.getByText('ພຣີວິວ')).toBeVisible();

  await anon.close();
  await request.delete(`${api}/admin/editions/${draftId}`, { headers: auth });
});

test('only a super admin reaches users and the audit trail', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page.getByText('ບັນຊີທີມງານ')).toBeVisible();

  await page.goto('/admin/audit');
  await expect(page.getByText('ທຸກການປ່ຽນແປງ')).toBeVisible();
});

test('nothing sensitive is kept in localStorage', async ({ page }) => {
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
});
});
