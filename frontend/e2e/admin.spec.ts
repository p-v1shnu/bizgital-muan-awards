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

/**
 * A real 1×1 PNG — signature, IHDR, IDAT, IEND, correct CRCs. The upload reads
 * a file's first bytes to decide what it is, so a placeholder string is not
 * something the API will take any more.
 */
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
);

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
    expect(body).toContain('ໜ້າປີສະແດງຫຍັງ');
    expect(body).toContain('ຟອມສົ່ງລາຍຊື່');
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
    // .first(): the closed library-picker dialog keeps its search results in
    // the DOM (see judges' own "ກຳມະການ ທົດສອບ" assertion above), and this
    // tier's own name is also a hit there.
    await expect(page.getByText('ຜູ້ສະໜັບສະໜູນຫຼັກ').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'ເລືອກຈາກຄັງ' })).toBeVisible();

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
  test('an empty category locks the announcement until it is removed', async ({ page, request }) => {
    const url = page.url().split('?')[0];

    // Adding a category means picking it from the library — a category not
    // there yet is added on its own page (/admin/categories), not from
    // inside an edition, so this one is made the way that page would.
    const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1';
    const login = await request.post(`${api}/auth/login`, {
      data: { email: 'admin@muanawards.com', password: 'a-very-long-password' },
    });
    const auth = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };
    await request.post(`${api}/admin/category-templates`, {
      headers: auth,
      data: { slug: 'empty-test', nameLo: 'ສາຂາທົດສອບວ່າງເປົ່າ' },
    });

    await page.goto(`${url}?tab=categories`);
    const deleteButton = page.getByRole('button', { name: 'ລຶບ ສາຂາທົດສອບວ່າງເປົ່າ' });
    // `Locator.isVisible()` checks the current DOM immediately rather than
    // waiting the way an `expect` assertion does — right after `goto`, the
    // category list is often still loading, so it reports "not there" even
    // when the category is in fact already assigned. Give it a bounded wait
    // instead, long enough to outlast that load.
    const isAlreadyAdded = () =>
      deleteButton
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

    try {
      // Idempotent: an earlier failed attempt at this same test (Playwright
      // retries automatically) may already have added the category and not
      // reached the cleanup below to remove it again — the picker would then
      // show it as already-assigned (disabled) rather than offer it to add,
      // so re-running the add flow ambiguously matches two elements. Adding
      // only when it is not already there makes a retry start from the same
      // state as a first attempt.
      if (!(await isAlreadyAdded())) {
        await page.getByRole('button', { name: 'ເພີ່ມສາຂາ' }).first().click();
        await page.getByPlaceholder('ຄົ້ນຫາສາຂາຈາກຄັງ…').fill('ສາຂາທົດສອບວ່າງເປົ່າ');
        await page.getByRole('button', { name: /ສາຂາທົດສອບວ່າງເປົ່າ/ }).click();
        await page.getByRole('button', { name: 'ບັນທຶກ' }).click();
        // The dialog never unmounts on close (see categories-tab.tsx), only
        // hides — its own copy of the picked template's name stays in the
        // DOM, so a bare text locator matches that too. Filtering a
        // paragraph by its text (rather than `getByRole(..., { name })`,
        // which computes accessible *name* — not a plain paragraph's text
        // content, so it never matches at all) targets only the list row.
        await expect(page.getByRole('paragraph').filter({ hasText: 'ສາຂາທົດສອບວ່າງເປົ່າ' })).toBeVisible();
      }

      await page.goto(url);
      await expect(page.getByRole('button', { name: /ໄປຂັ້ນ/ })).toBeDisabled();
      await expect(page.getByText(/ຕ້ອງແກ້ \d+ ຢ່າງທີ່ໝາຍສີແດງກ່ອນ/)).toBeVisible();
    } finally {
      // Resilient the same way: nothing to clean up if the category was
      // never actually added (a failure before that point).
      await page.goto(`${url}?tab=categories`);
      if (await isAlreadyAdded()) {
        await deleteButton.click();
        await page.getByRole('button', { name: 'ລຶບ', exact: true }).click();
        // The confirm dialog repeats the name, so waiting on the text alone
        // matches two things. The row's own delete button is the row.
        await expect(deleteButton).toBeHidden();
      }
    }

    await page.goto(url);
    // The same real save-then-refetch round trip as the add above, this time
    // for the delete — generous headroom rather than assuming an instant
    // update to the publish checklist.
    await expect(page.getByRole('button', { name: /ໄປຂັ້ນ/ })).toBeEnabled({ timeout: 30_000 });
  });

  /**
   * A winner can only be picked once nominees are announced, so this cannot
   * run against the seed's own 2026 — kept at PUBLISHED for the tests above —
   * without derailing every other spec that expects 2026 to still be
   * accepting submissions. A throwaway edition, already past that phase,
   * keeps the two concerns apart.
   */
  test('crowning a winner un-crowns the previous one', async ({ page, request }) => {
    const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1';
    const login = await request.post(`${api}/auth/login`, {
      // A login off this file's own shared address (203.0.113.11, set above)
      // would be one more attempt on a budget every other test in the file
      // already draws from — this setup needs its own address, the same
      // reason each spec file has one.
      headers: { 'X-Forwarded-For': '203.0.113.14' },
      data: { email: 'admin@muanawards.com', password: 'a-very-long-password' },
    });
    const auth = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

    const edition = await request.post(`${api}/admin/editions`, {
      headers: auth,
      // Deliberately older than every other seeded year (2025/2026), so this
      // never becomes "the latest edition" the homepage and nav point at.
      data: { year: 2010, slug: '2010', titleLo: 'ມ່ວນອາວອດສ໌ 2010' },
    });
    const editionId = (await edition.json()).data.id;
    const template = await request.post(`${api}/admin/category-templates`, {
      headers: auth,
      // Same reason the creators below avoid "ຜູ້ຊະນະ" — a category name
      // containing it is itself a sidebar nav button whose text also
      // matches, and it sits before both winner-toggle buttons in DOM order.
      data: { slug: 'crown-test', nameLo: 'ສາຂາທົດສອບ ຄ' },
    });
    const category = await request.post(`${api}/admin/editions/${editionId}/categories`, {
      headers: auth,
      data: { templateId: (await template.json()).data.id },
    });
    const categoryId = (await category.json()).data.id;

    for (const [slug, nameLo] of [
      // Deliberately not containing "ຜູ້ຊະນະ" — that word plus the winner
      // count is exactly what the assertion below searches for, and a
      // creator name containing it as a substring makes the search match
      // twice.
      ['crown-test-1', 'ຄົນທົດສອບ ກ'],
      ['crown-test-2', 'ຄົນທົດສອບ ຂ'],
    ]) {
      const creator = await request.post(`${api}/admin/creators`, { headers: auth, data: { slug, nameLo } });
      await request.post(`${api}/admin/categories/${categoryId}/nominations`, {
        headers: auth,
        data: { creatorId: (await creator.json()).data.id },
      });
    }

    const published = await request.patch(`${api}/admin/editions/${editionId}/phase`, {
      headers: auth,
      data: { phase: 'PUBLISHED' },
    });
    expect(published.status(), 'setup: publishing the throwaway edition').toBe(200);
    const announced = await request.patch(`${api}/admin/editions/${editionId}/phase`, {
      headers: auth,
      data: { phase: 'NOMINEES_ANNOUNCED' },
    });
    expect(announced.status(), 'setup: announcing nominees, which unlocks the winner toggle').toBe(200);

    await page.goto(`/admin/editions/${editionId}?tab=nominees`);
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
    data: { year: 2031, slug: '2031', titleLo: 'ມ່ວນອາວອດສ໌ 2031' },
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

/**
 * The page whose entire job is copy the team owns, and the one place a form is
 * filled from the server rather than typed from scratch — so what needs proving
 * is that the values arrive, that saving keeps them, and that a reload agrees.
 *
 * Nothing here asserted any of that before: the specs read these words off the
 * public pages, where the seed had put them through the API, so the form itself
 * could have been broken without a single test noticing.
 */
test('the site content form arrives filled, and a save survives a reload', async ({ page }) => {
  await page.goto('/admin/site');

  // Seeded through the API, so a blank box here means the form never read it.
  const brand = page.getByRole('textbox', { name: /ຂໍ້ຄວາມຢູ່ກ້ອງ/ });
  expect((await brand.inputValue()).trim(), 'the form starts from what the server holds').not.toBe(
    '',
  );

  // The caption is the one field the seed leaves alone, so writing to it cannot
  // change what another spec reads off a public page.
  const caption = page.getByRole('textbox', { name: /ຄຳບັນຍາຍກ້ອງຮູບ/ });
  const original = await caption.inputValue();
  try {
    await caption.fill('ຄຳບັນຍາຍທົດສອບ');
    await page.getByRole('button', { name: 'ບັນທຶກ' }).first().click();
    await expect(page.getByText('ບັນທຶກແລ້ວ')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('textbox', { name: /ຄຳບັນຍາຍກ້ອງຮູບ/ })).toHaveValue(
      'ຄຳບັນຍາຍທົດສອບ',
    );
  } finally {
    // Put the year back as it was found, cleared box included.
    const after = page.getByRole('textbox', { name: /ຄຳບັນຍາຍກ້ອງຮູບ/ });
    await after.fill(original);
    await page.getByRole('button', { name: 'ບັນທຶກ' }).first().click();
    await expect(page.getByText('ບັນທຶກແລ້ວ')).toBeVisible();
  }
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
      file: { name: 'probe.png', mimeType: 'image/png', buffer: ONE_PIXEL_PNG },
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

/**
 * The upload used to believe the `Content-Type` written on the multipart part,
 * which the sender chooses. Anything at all could be sent labelled as a PNG
 * and was then stored under a `.png` key and served as `image/png` from the
 * host every page loads its pictures from. The bytes decide the type now
 * (`sniffImageType` in storage.service.ts), so a truthful label on untruthful
 * content buys nothing.
 *
 * Outside the `signed in` block on purpose, twice over. It needs no browser
 * session — it only ever holds a bearer token — and that block's `beforeEach`
 * signs in through the form for every test under it. Written inside it, this
 * one drew two more sign-ins from the file's shared address: the sixteen
 * `beforeEach` logins, the wrong-password test and three API logins already
 * come to exactly twenty inside a minute, which is the whole per-address
 * budget (PRD §8). Test eighteen was the first request past the ceiling, so
 * its `beforeEach` was throttled, the form never navigated, and it failed in
 * the hook without reaching a single assertion.
 */
test('an upload that is not really an image is refused, whatever it calls itself', async ({ request }) => {
  const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1';
  const login = await request.post(`${api}/auth/login`, {
    // Its own address, for the same reason the winner-crowning setup above
    // takes one: the budget on this file's shared address is already spent.
    headers: { 'X-Forwarded-For': '203.0.113.15' },
    data: { email: 'admin@muanawards.com', password: 'a-very-long-password' },
  });
  const auth = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

  for (const [what, buffer] of [
    ['a page of HTML', Buffer.from('<html><script>alert(1)</script></html>')],
    ['an SVG, which browsers do run scripts in', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
  ] as const) {
    const refused = await request.post(`${api}/admin/uploads`, {
      headers: auth,
      failOnStatusCode: false,
      multipart: {
        folder: 'creators',
        // The label a sender would pick to get past a check that trusts it.
        file: { name: 'looks-fine.png', mimeType: 'image/png', buffer },
      },
    });
    expect(refused.status(), `${what} must not be stored`).toBe(400);
  }
});
