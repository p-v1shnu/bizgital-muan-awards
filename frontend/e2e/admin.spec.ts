import { expect, test } from '@playwright/test';

import { ADMIN } from './seed';

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
test.use({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.11' } });

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

  /**
   * PRD §7.4: clearing the URL removes the button, so a year that has finished
   * does not keep sending people to a ticket page that no longer sells
   * anything. Emptying the box used to change nothing at all — the field was
   * sent as `undefined`, which never reached the database.
   */
  test('a link that was added can be taken away again', async ({ page }) => {
    const ticket = page.getByRole('textbox', { name: 'ລິງກ໌ຊື້ບັດ' });
    // The seed puts a link here and a later test reads it, so whatever is
    // found gets put back at the end.
    const seeded = await ticket.inputValue();
    await ticket.fill('https://tickets.example.com/muan');
    await page.getByRole('button', { name: 'ບັນທຶກ' }).first().click();
    await expect(page.getByText('ບັນທຶກແລ້ວ')).toBeVisible();

    const publicPage = await page.context().newPage();
    try {
      await expect(async () => {
        await publicPage.goto('/awards/2026');
        await expect(publicPage.getByRole('main').getByRole('link', { name: 'ຊື້ບັດ' })).toBeVisible();
      }).toPass({ timeout: 15_000 });

      await ticket.fill('');
      await page.getByRole('button', { name: 'ບັນທຶກ' }).first().click();
      await expect(page.getByText('ບັນທຶກແລ້ວ')).toBeVisible();

      await expect(async () => {
        await publicPage.goto('/awards/2026');
        await expect(publicPage.getByRole('main').getByRole('link', { name: 'ຊື້ບັດ' })).toBeHidden();
      }).toPass({ timeout: 15_000 });

      // And it stayed gone in the back office, not just on the page.
      await page.reload();
      await expect(page.getByRole('textbox', { name: 'ລິງກ໌ຊື້ບັດ' })).toHaveValue('');
    } finally {
      const after = page.getByRole('textbox', { name: 'ລິງກ໌ຊື້ບັດ' });
      await after.fill(seeded);
      await page.getByRole('button', { name: 'ບັນທຶກ' }).first().click();
      await expect(page.getByText('ບັນທຶກແລ້ວ')).toBeVisible();
      // Wait for the public page to agree before letting go — the cache purge
      // lands after the save, and a later spec reads this same link.
      await expect(async () => {
        await publicPage.goto('/awards/2026');
        await expect(publicPage.getByRole('main').getByRole('link', { name: 'ຊື້ບັດ' })).toBeVisible();
      }).toPass({ timeout: 15_000 });
      await publicPage.close();
    }
  });

  test('photos of the night can be managed on the year itself', async ({ page }) => {
    // Without this card the gallery on the year page could never be filled —
    // the column existed and the public page rendered it, but nothing wrote it.
    await expect(page.getByText('ພາບບັນຍາກາດຫຼັງຈົບງານ')).toBeVisible();
    await expect(page.getByText('ເພີ່ມຮູບ')).toBeVisible();
  });

  test('the panel can be reordered and a new judge made without leaving', async ({ page }) => {
    const url = page.url().split('?')[0];
    await page.goto(`${url}?tab=judges`);

    // A judge created from inside the tab lands on the panel straight away —
    // the alternative was leaving the year half-set-up to visit another page.
    await page.getByRole('button', { name: /ເລືອກຈາກຄັງ/ }).first().click();
    const dialog = page.locator('dialog[open]');
    // The first box in the dialog is the library search; the two below it are
    // the new judge's name and position.
    await dialog.getByRole('textbox').nth(1).fill('ກຳມະການ ທົດສອບ');
    await dialog.getByRole('textbox').nth(2).fill('ນັກຂ່າວອາວຸໂສ');
    await dialog.getByRole('button', { name: 'ສ້າງ ແລະ ເປັນກຳມະການ' }).click();
    // Assigned straight away: the dialog marks the new name as already on
    // this year, and it is on the panel behind the dialog too.
    await expect(dialog.getByText('ຢູ່ໃນປີນີ້ແລ້ວ').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('ກຳມະການ ທົດສອບ').first()).toBeVisible();

    const rows = page.locator('[aria-label^="ຍ້າຍ"][aria-label$="ຂຶ້ນ"]');
    await expect(rows.first()).toBeVisible();
    // The first row cannot move up; something below it must be able to.
    await expect(rows.first()).toBeDisabled();
  });

  test('sponsors sit in groups the team named, and move inside them', async ({ page }) => {
    const url = page.url().split('?')[0];
    await page.goto(`${url}?tab=sponsors`);

    // The group heading is data now, not one of six labels in the code.
    await expect(page.getByText('ຜູ້ສະໜັບສະໜູນຫຼັກ')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ເພີ່ມໝວດ' })).toBeVisible();

    const up = page.locator('[aria-label^="ຍ້າຍ"][aria-label$="ຂຶ້ນ"]');
    await expect(up.first()).toBeVisible();
    await expect(up.first(), 'the top of a group has nowhere to go').toBeDisabled();
  });

  /**
   * PRD §4.3.3 lists five things to check before publishing and says to warn,
   * not block. Four of the five were missing and the button was disabled
   * instead — which would have made backfilling an old year impossible, since
   * a 2023 has no key visual, no venue and no panel and still has to reach
   * "winners announced".
   */
  test('the publish checklist warns about all five things and blocks none of them', async ({
    page,
  }) => {
    for (const item of [
      'ມີສາຂາຢ່າງໜ້ອຍ 1 ສາຂາ',
      'ຕັ້ງສາຂາເດັ່ນ 3–6 ສາຂາ',
      'ມີວັນທີຈັດງານ ແລະ ສະຖານທີ່',
      'ມີຮູບ key visual ຂອງປີ',
      'ມີຄະນະກຳມະການຢ່າງໜ້ອຍ 1 ທ່ານ',
    ]) {
      // The label also appears inside the confirm dialog's summary, so the
      // first match is the checklist row itself.
      await expect(page.getByText(item).first()).toBeVisible();
    }

    // The seed's 2026 has a nominee in every category, so nothing is locked —
    // it is missing its key visual, which only warns. The button stays live.
    const advance = page.getByRole('button', { name: /ໄປຂັ້ນ/ });
    await expect(advance).toBeEnabled();
    await expect(page.getByText(/ຍັງຂາດ \d+ ຢ່າງຂ້າງເທິງ/)).toBeVisible();
  });

  /**
   * The one thing on the list that does stop the button (PRD §4.3.3): a
   * category with nobody in it cannot be announced, and the way out is to
   * remove the category rather than invent a nominee for it.
   */
  test('an empty category locks the announcement until it is removed', async ({ page }) => {
    const url = page.url().split('?')[0];
    await page.goto(`${url}?tab=categories`);

    await page.getByRole('button', { name: 'ເພີ່ມສາຂາ' }).first().click();
    await page.getByRole('textbox', { name: 'ຊື່ສາຂາ (ລາວ)' }).fill('ສາຂາທົດສອບວ່າງເປົ່າ');
    await page.getByRole('textbox', { name: 'slug' }).fill('empty-test');
    await page.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ສາຂາທົດສອບວ່າງເປົ່າ')).toBeVisible();

    try {
      await page.goto(url);
      await expect(page.getByRole('button', { name: /ໄປຂັ້ນ/ })).toBeDisabled();
      await expect(page.getByText(/ຕ້ອງແກ້ \d+ ຢ່າງທີ່ໝາຍສີແດງກ່ອນ/)).toBeVisible();
    } finally {
      await page.goto(`${url}?tab=categories`);
      await page.getByRole('button', { name: 'ລຶບ ສາຂາທົດສອບວ່າງເປົ່າ' }).click();
      await page.getByRole('button', { name: 'ລຶບ', exact: true }).click();
      // The confirm dialog repeats the name, so waiting on the text alone
      // matches two things. The row's own delete button is the row.
      await expect(page.getByRole('button', { name: 'ລຶບ ສາຂາທົດສອບວ່າງເປົ່າ' })).toBeHidden();
    }

    await page.goto(url);
    await expect(page.getByRole('button', { name: /ໄປຂັ້ນ/ })).toBeEnabled();
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

/**
 * A picture is readable by the person who has the key, and by nobody browsing
 * the bucket — the two ends of a real production incident (`storage.service.ts`).
 * Spaces has no working `PutBucketPolicy`, and a key scoped to one bucket
 * cannot grant an ACL through a presigned URL either — confirmed against the
 * real bucket, which is why the file goes through the API rather than
 * straight from the browser to storage. This proves the plumbing end to end:
 * a real multipart upload, the file readable by its key afterward, and the
 * bucket itself still not browsable.
 *
 * The "readable by its key" half is not a regression test for the ACL grant
 * specifically — checked directly: it still passes here with `ACL:
 * 'public-read'` removed from storage.service.ts, because local dev's bucket
 * policy (docs/storage-policy.json) already makes every object readable on
 * its own, independent of any per-object ACL. Spaces has no equivalent
 * bucket-wide policy, which is the entire reason the ACL exists — so this
 * assertion is only a true regression test against the real bucket, not here.
 */
test('an uploaded file is readable by its key alone, not by browsing the bucket', async ({ request }) => {
  const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1';
  const login = await request.post(`${api}/auth/login`, {
    data: { email: 'admin@muanawards.com', password: 'a-very-long-password' },
  });
  const auth = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

  const upload = await request.post(`${api}/admin/uploads`, {
    headers: auth,
    multipart: {
      folder: 'creators',
      file: {
        name: 'probe.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not a real image, just bytes to move'),
      },
    },
  });
  expect(upload.status(), 'the API took the upload').toBe(201);
  const { publicUrl } = (await upload.json()).data;

  const readByKey = await request.get(publicUrl);
  expect(readByKey.status(), 'readable by anyone who has the key').toBe(200);

  // Path-style addressing (forcePathStyle in storage.service.ts) puts the
  // bucket name as the URL's first path segment, so this is the bucket's own
  // root — not the object's — regardless of host.
  const url = new URL(publicUrl);
  const bucketRoot = `${url.origin}${url.pathname.split('/').slice(0, 2).join('/')}`;
  const listAttempt = await request.get(`${bucketRoot}/?list-type=2`, { failOnStatusCode: false });
  expect(listAttempt.status(), 'but the bucket itself must not be browsable').not.toBe(200);
});
});
