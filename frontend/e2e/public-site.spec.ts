import { expect, request, test } from '@playwright/test';

import { ADMIN, API } from './seed';

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
test.use({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.12' } });

/**
 * Opens or closes entries on a year through the API, the way the back office
 * does. Saving triggers the site's cache purge, so the public pages follow.
 */
async function setEntries(year: number, open: boolean) {
  const api = await request.newContext({ baseURL: `${API}/` });
  const login = await api.post('auth/login', { data: ADMIN });
  const auth = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };
  const editions = await (await api.get('admin/editions', { headers: auth })).json();
  const edition = editions.data.find((row: { year: number }) => row.year === year);
  const response = await api.patch(`admin/editions/${edition.id}/submissions`, {
    headers: auth,
    data: { submissionsOpen: open },
  });
  expect(response.ok()).toBe(true);
  await api.dispose();
}

/** No Lao string may fall back to a face that does not carry Lao glyphs. */
async function laoFallbacks(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.children.length === 0 && /[຀-໿]/.test(el.textContent ?? '')) {
        const family = getComputedStyle(el).fontFamily;
        if (!/Lao/i.test(family)) bad.push(`${el.tagName}: ${family}`);
      }
    });
    return bad;
  });
}

test.describe('homepage', () => {
  test('renders the evergreen brand hub', async ({ page }) => {
    await page.goto('/');

    // Scoped to main: the brand line also appears in the footer, by design.
    const main = page.getByRole('main');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ມ່ວນອາວອດສ໌');
    await expect(main.getByText('ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນ')).toBeVisible();
    await expect(main.getByText('ໄຮໄລທ໌ຜູ້ຊະນະລ່າສຸດ')).toBeVisible();
    await expect(main.getByText('ປີທີ່ຜ່ານມາ')).toBeVisible();
  });

  test('keeps per-year content off the homepage (PRD §6.1.1)', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();

    // Each of these belongs to one year and would go stale here.
    expect(body, 'sponsors belong to a year').not.toContain('Beerlao');
    expect(body, 'judges belong to a year').not.toContain('ສົມສັກ');
    expect(body, 'the category list belongs to a year').not.toContain('ຄອນເທັ້ນອາຫານ');
  });

  test('the entry cards are not painted over by the hero', async ({ page }) => {
    await page.goto('/');
    const covered = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('p')].find(
        (el) => el.textContent?.trim() === 'ທຳນຽບຜູ້ຊະນະ',
      );
      if (!heading) return 'heading-missing';
      const box = heading.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit && (hit === heading || heading.contains(hit) || hit.contains(heading)) ? null : 'covered';
    });
    expect(covered).toBeNull();
  });

  test('offers the submit call to action while entries are open', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header a[href="/submit"]')).toBeVisible();
  });
});

test.describe('a year page follows its phase', () => {
  test('a published year lists categories but no nominees', async ({ page }) => {
    await page.goto('/awards/2026');

    await expect(page.getByText('ສາຂາລາງວັນປີນີ້')).toBeVisible();
    await expect(page.getByText('ຈະປະກາດພາຍຫຼັງ')).toBeVisible();
    await expect(page.getByText('ຄຳຫຼ້າ ສີສຸວັນ')).toHaveCount(0);
  });

  test('a published year still shows its judges, sponsors and external links', async ({ page }) => {
    await page.goto('/awards/2026');
    const body = await page.locator('body').innerText();

    expect(body).toContain('ສົມສັກ');
    expect(body).toContain('Beerlao');
    expect(body).toContain('ຊື້ບັດ');
    expect(body).toContain('ໂຫວດ');
  });

  test('an announced year shows nominees and marks the winner', async ({ page }) => {
    await page.goto('/awards/2025');

    await expect(page.getByText('ຜູ້ຊະນະທຸກສາຂາ')).toBeVisible();
    await expect(page.getByText('ຄຳຫຼ້າ ສີສຸວັນ').first()).toBeVisible();
    await expect(page.getByText('ຜູ້ຊະນະ', { exact: true }).first()).toBeVisible();
  });

  test('a year page lists what happens on the night (PRD §6.1.2 §5)', async ({ page }) => {
    await page.goto('/awards/2025');

    const programme = page.getByRole('list', { name: 'ກິດຈະກຳໃນງານ' });
    await expect(page.getByText('ກິດຈະກຳໃນງານ')).toBeVisible();
    await expect(programme.getByRole('listitem')).toHaveCount(3);
    await expect(programme.getByText('ຍ່າງພົມແດງ')).toBeVisible();
  });

  test('a long year groups its categories and folds the winners table', async ({ page }) => {
    await page.goto('/awards/2025');
    const main = page.getByRole('main');

    // Headings appear only because the seed fills groupLo in (PRD §7.6).
    await expect(main.getByRole('heading', { name: 'ສາຍຄອນເທັ້ນ' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'ສາຍໄລຟ໌ສະໄຕລ໌' })).toBeVisible();

    // 13 winners, so the rows past twelve stay folded until asked for. Scoped
    // to the results table: every category name also appears in the accordion.
    const results = main
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'ຜູ້ຊະນະທຸກສາຂາ' }) });
    const fold = results.getByText(/ເບິ່ງເພີ່ມອີກ \d+ ສາຂາ/);

    await expect(fold).toBeVisible();
    await expect(results.getByText('ສາຂາເພີ່ມເຕີມ 10')).toBeHidden();
    await fold.click();
    await expect(results.getByText('ສາຂາເພີ່ມເຕີມ 10')).toBeVisible();
  });

  /**
   * The two switches of PRD §4 are independent, and the public side used to
   * read one off the other: the invitation to send a name appeared because the
   * year was PUBLISHED, not because the form was open. So it showed on a year
   * whose form had never opened, and would have vanished the moment nominees
   * were announced while entries were still being taken.
   *
   * 2026 is published with entries open; 2025 has finished and never took any.
   */
  test('the invitation follows the form, not the phase', async ({ page }) => {
    await page.goto('/awards/2026');
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: 'ສົ່ງລາຍຊື່' })).toBeVisible();
    await expect(main.getByText('ປິດຮັບລາຍຊື່ແລ້ວ')).toBeHidden();

    // Close entries and leave the phase exactly where it is. Reading the phase
    // for this — which is what the page used to do — would still show the
    // invitation, because PUBLISHED has not changed.
    try {
      await setEntries(2026, false);
      await expect(async () => {
        await page.reload();
        await expect(main.getByRole('link', { name: 'ສົ່ງລາຍຊື່' })).toBeHidden();
        await expect(main.getByText('ປິດຮັບລາຍຊື່ແລ້ວ')).toBeVisible();
      }).toPass({ timeout: 15_000 });
    } finally {
      await setEntries(2026, true);
      // Put the page back too, not just the row. The API purges the site's
      // cache after a save, and that lands a moment later — a test that ends
      // the instant the row changes hands the next one a page that still says
      // entries are closed, which is what made six unrelated tests fail.
      await expect(async () => {
        await page.goto('/awards/2026');
        await expect(main.getByRole('link', { name: 'ສົ່ງລາຍຊື່' })).toBeVisible();
      }).toPass({ timeout: 15_000 });
    }

    // A backfilled year says nothing about entries at all — neither an
    // invitation nor a notice that they closed.
    await page.goto('/awards/2025');
    const finished = page.getByRole('main');
    await expect(finished.getByRole('link', { name: 'ສົ່ງລາຍຊື່' })).toBeHidden();
    await expect(finished.getByText('ປິດຮັບລາຍຊື່ແລ້ວ')).toBeHidden();
  });

  test('the homepage card offers the form while it is open', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('div').filter({ hasText: /^ງານປີນີ້ · 2026/ }).first();
    await expect(card.getByText('ເປີດຮັບສະເໜີຊື່ແລ້ວ')).toBeVisible();
    await expect(card.getByRole('link', { name: 'ສົ່ງລາຍຊື່' })).toBeVisible();
  });

  test('an unknown year is a 404, not an error', async ({ page }) => {
    const response = await page.goto('/awards/2099');
    expect(response?.status()).toBe(404);
    // Failure pages are in English by the owner's decision — an error is the
    // one screen nobody reviews, so unreviewed Lao is worse than plain English.
    await expect(page.getByText('Page not found')).toBeVisible();
  });
});

test('a category page carries its own share card', async ({ page }) => {
  await page.goto('/awards/2025/creator-of-the-year');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ຜູ້ສ້າງສັນແຫ່ງປີ');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    /ຜູ້ສ້າງສັນແຫ່ງປີ/,
  );
});

test('the hall of winners lists only years that have announced', async ({ page }) => {
  await page.goto('/winners');
  const body = await page.locator('body').innerText();

  expect(body).toContain('2025');
  expect(body, '2026 has not announced results').not.toContain('ມ່ວນອາວອດສ໌ 2026');
});

test('a creator profile shows only announced appearances', async ({ page }) => {
  await page.goto('/creators/khamla');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ຄຳຫຼ້າ ສີສຸວັນ');
  const history = await page.locator('ol').last().innerText();
  expect(history).toContain('2025');
  expect(history, '2026 has not announced nominees').not.toContain('2026');
});

test('the submission form accepts an entry', async ({ page }) => {
  await page.goto('/submit');

  // Scoped to main: the nav carries the same year label.
  await expect(page.getByRole('main').getByText('ງານປີ 2026')).toBeVisible();
  await expect(page.getByText('ບໍ່ບັງຄັບ')).toBeVisible();

  await page.selectOption('form select', { index: 1 });
  // By name, not by position: with sixteen categories the form also carries a
  // filter box above the picker, which would otherwise be the first input.
  await page.getByRole('combobox', { name: /ຊື່ຜູ້ສ້າງສັນ/ }).fill('ນັກສ້າງສັນ ທົດສອບ');
  await page.locator('form textarea').fill('ຜົນງານດີຕະຫຼອດປີ');
  await page.locator('form button[type=submit]').click();

  await expect(page.getByText('ຮັບຊື່ແລ້ວ')).toBeVisible();
});

test('the form suggests names already in the library', async ({ page }) => {
  await page.goto('/submit');

  const name = page.getByRole('combobox', { name: /ຊື່ຜູ້ສ້າງສັນ/ });
  await name.fill('ຄຳ');

  // Scoped to the suggestion list: the category picker is a <select>, whose
  // native options answer to the same role.
  const list = page.getByRole('listbox', { name: 'ຊື່ທີ່ມີຢູ່ແລ້ວ' });
  const suggestion = list.getByRole('option').filter({ hasText: 'ຄຳຫຼ້າ ສີສຸວັນ' });
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  // Choosing fills the field with the spelling already on record, which is the
  // whole point: fewer variants of one person for the team to merge.
  await expect(name).toHaveValue('ຄຳຫຼ້າ ສີສຸວັນ');
  await expect(list).toBeHidden();
});

test('a year with many categories gets a filter above the picker', async ({ page }) => {
  await page.goto('/submit');

  const filter = page.getByRole('searchbox', { name: 'ກັ່ນຕອງສາຂາ' });
  await expect(filter, '2026 is seeded with 16 categories (PRD §7.6)').toBeVisible();

  const picker = page.locator('form select');
  const before = await picker.locator('option').count();
  await filter.fill('ອາຫານ');

  await expect(picker.locator('option')).toHaveCount(1);
  expect(before).toBeGreaterThan(15);
  await expect(picker.locator('option')).toHaveText([/ອາຫານ/]);
});

test('the brand is the real logo, and a bare link still shares a picture', async ({ page }) => {
  await page.goto('/');

  // The lockups ship as separate files per background; a CSS filter must never
  // stand in for one (PRD §6.0.2).
  const nav = page.getByRole('banner').getByRole('img').first();
  await expect(nav).toHaveAttribute('src', /brand%2Fhorizontal-black|brand\/horizontal-black/);
  for (const image of await page.getByRole('img').all()) {
    const filter = await image.evaluate((element) => getComputedStyle(element).filter);
    expect(filter, 'no logo may be recoloured with invert()').not.toContain('invert');
  }

  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
    'content',
    /og-default\.png/,
  );

  // A page that has its own picture keeps it rather than the fallback.
  await page.goto('/awards/2025/creator-of-the-year');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /ຜູ້ສ້າງສັນ/);
});

test('no page fails an automated accessibility check', async ({ page }) => {
  // Contrast, labels, roles, landmarks — the machine-checkable half of WCAG
  // 2.1 AA. It caught footer headings at 4.29:1 and a faded panel at 2:1.
  const AxeBuilder = (await import('@axe-core/playwright')).default;
  for (const path of ['/', '/awards/2025', '/winners', '/creators/khamla', '/submit', '/about']) {
    // Not `networkidle`: after a fresh build the image optimiser is encoding
    // every size for the first time, and the page can render perfectly well
    // while a picture is still being produced. Axe reads the DOM, so waiting
    // for the document is the condition that actually matters — waiting for
    // the network to fall quiet made this fail for a reason unrelated to
    // accessibility.
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});

/**
 * PRD §6.0.2 rule 1 and rule 2 together: the primary button is ink, brand
 * shows on hover, and brand as a *background* is reserved for six specific
 * marks. Every primary button on the site had it as its resting colour, which
 * is what the rule exists to stop — the winner's badge and the foil rule stop
 * meaning anything if the colour is everywhere.
 */
test('primary buttons rest on ink, not on the brand colour', async ({ page }) => {
  await page.goto('/submit');
  const submit = page.getByRole('button', { name: 'ສົ່ງລາຍຊື່' });
  await expect(submit).toBeVisible();

  const resting = await submit.evaluate((node) => getComputedStyle(node).backgroundColor);
  // ink #221C19
  expect(resting).toBe('rgb(34, 28, 25)');
});

test('the keyboard reaches the content without walking the nav', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'ຂ້າມໄປເນື້ອຫາຫຼັກ' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#content')).toBeVisible();
});

test('each page names one address, and says what it is to a machine', async ({ page }) => {
  // Without a canonical, /awards/latest and /awards/2025 read as two copies of
  // the same page; without the JSON-LD, a creator's history is just text.
  await page.goto('/awards/2025');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/awards\/2025$/);

  const event = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').first().innerText()).replace(
      /\\u003c/g,
      '<',
    ),
  );
  expect(event['@type']).toBe('Event');

  await page.goto('/creators/khamla');
  const person = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').first().innerText()).replace(
      /\\u003c/g,
      '<',
    ),
  );
  expect(person['@type']).toBe('Person');
  expect(person.award?.length, 'a win belongs in the record a search engine reads').toBeGreaterThan(0);
});

test('the site says what it does with what people type in', async ({ page }) => {
  await page.goto('/submit');
  await expect(page.getByRole('link', { name: 'ອ່ານເລື່ອງຂໍ້ມູນສ່ວນຕົວ' })).toBeVisible();

  await page.goto('/about#privacy');
  const privacy = page.locator('#privacy');
  await expect(privacy.getByText('ເກັບໄວ້ດົນປານໃດ')).toBeVisible();
  await expect(privacy.getByText('12 ເດືອນ')).toBeVisible();

  // The page has to describe the analytics that actually runs: it starts with
  // the page, so it must not claim to wait for permission.
  await expect(privacy.getByText('Google Analytics', { exact: true })).toBeVisible();
  await expect(privacy.getByText('ຕັ້ງແຕ່ທ່ານເປີດໜ້າ')).toBeVisible();
  await expect(privacy.getByRole('link', { name: /ປິດ Google Analytics/ })).toBeVisible();
});

/**
 * The privacy section tells a submitter to write in to be forgotten, and the
 * FAQ sends a would-be sponsor to the same place — both of which are only true
 * if the channels the team entered actually reach the page.
 */
test('the page says how to reach the team', async ({ page }) => {
  await page.goto('/about#contact');
  const contact = page.locator('#contact');

  await expect(contact.getByRole('link', { name: 'info@muanawards.la' })).toHaveAttribute(
    'href',
    'mailto:info@muanawards.la',
  );
  // A single number is dialable, spaces and all.
  await expect(contact.getByRole('link', { name: '020 5555 5555' })).toHaveAttribute(
    'href',
    'tel:02055555555',
  );
  // The team's Facebook page belongs to the footer, and is not repeated here.
  await expect(contact.getByRole('link', { name: /facebook/i })).toHaveCount(0);
  await expect(page.locator('footer').getByRole('link', { name: 'Facebook' })).toBeVisible();
});

/**
 * The FAQ is the team's, questions included: the page renders the list it was
 * given, in the order it was given, and holds no questions of its own.
 */
test('the FAQ the team wrote reaches the page', async ({ page }) => {
  await page.goto('/about#faq');
  const faq = page.locator('#faq');

  // Every entry the seed gave it, in that order, and nothing the page kept for
  // itself — the whole list is the team's, questions included.
  await expect(faq.locator('details summary')).toHaveText([
    'ໃຜສາມາດສະເໜີຊື່ໄດ້?',
    'ຈຳນວນຄັ້ງທີ່ຖືກສະເໜີ ມີຜົນຕໍ່ຜົນລາງວັນບໍ?',
    'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊີງມີຫຍັງແດ່?',
    'ຄະນະກຳມະການເລືອກມາແນວໃດ?',
    'ຢາກຮ່ວມເປັນຜູ້ສະໜັບສະໜູນ ຕິດຕໍ່ໃສ?',
  ]);

  const eligibility = faq.locator('details').nth(2);
  await eligibility.locator('summary').click();
  // Both paragraphs of the answer, as two paragraphs rather than one run-on.
  await expect(eligibility.locator('p')).toHaveText([
    'ຜູ້ສ້າງສັນຄອນເທັ້ນລາວ ຫຼື ຄົນທີ່ອາໄສຢູ່ ສປປ ລາວ',
    'ມີຜົນງານເຜີຍແຜ່ໃນຮອບປີທີ່ຕັດສິນ',
  ]);

  await faq.getByText('ຄະນະກຳມະການເລືອກມາແນວໃດ?').click();
  await expect(faq.getByText('ທີມງານເຊີນຄະນະກຳມະການເອງທຸກປີ', { exact: false })).toBeVisible();
});

/**
 * The homepage band and /about's steps are one list in /admin/site. They were
 * two copies before, and the copies had drifted apart in three of four steps —
 * so what is worth testing is not that either page renders, but that they agree.
 */
test('both pages describe judging in the same words', async ({ page }) => {
  await page.goto('/about#judging');
  const onAbout = await page.locator('#judging li').allInnerTexts();

  await page.goto('/');
  const band = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'ລາງວັນນີ້ຕັດສິນແນວໃດ' }) });
  const onHome = await band.locator('li').allInnerTexts();

  const normalise = (rows: string[]) => rows.map((row) => row.replace(/^\d+\.\s*/, '').trim());
  expect(normalise(onHome)).toEqual(normalise(onAbout));
  expect(normalise(onAbout)[1]).toContain('ທີມງານກວດຄຸນສົມບັດ');
});

/**
 * The cards under the hero and the list on /submit read their words from
 * /admin/site now. Both had them written into the page, so what is worth holding
 * is that the database's wording is what actually reaches the browser.
 */
test('the card copy and the submit list come from the back office', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  // 2026 is published with entries open, so the entriesOpen card wins.
  await expect(main.getByText('ເປີດຮັບສະເໜີຊື່ແລ້ວ')).toBeVisible();
  await expect(main.getByText('ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ນັບແຕ່ປີທຳອິດ')).toBeVisible();

  await page.goto('/submit');
  const after = page.getByRole('list').filter({ hasText: 'ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື' });
  await expect(after.getByRole('listitem')).toHaveText([
    'ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື',
    'ຜົນຕັດສິນມາຈາກຄະນະກຳມະການ',
  ]);
});

/**
 * The tab title and the description a search engine prints. Both were written
 * into the pages; /about's are seeded with different words, so this fails if the
 * page stops reading them from the back office — and the untouched pages prove
 * the fallback still holds.
 */
test('the page title and description come from the back office', async ({ page }) => {
  await page.goto('/about');
  await expect(page).toHaveTitle('ກ່ຽວກັບງານ ມ່ວນອາວອດສ໌ · ມ່ວນອາວອດສ໌');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'ທີ່ມາຂອງງານ, ເກນການຕັດສິນ ແລະ ຄຳຖາມທີ່ພົບເລື້ອຍ',
  );

  // /winners has nothing set, so it must still carry the page's own words
  // rather than an empty title.
  await page.goto('/winners');
  await expect(page).toHaveTitle('ທຳນຽບຜູ້ຊະນະ · ມ່ວນອາວອດສ໌');
});

/**
 * Sponsor groups were an enum of six with their names written into the year page.
 * They are the year's own rows now, so the heading above a logo has to be the name
 * the team typed — the seed names one group and puts Beerlao in it.
 */
test('a sponsor group is headed with the name the team gave it', async ({ page }) => {
  await page.goto('/awards/2026');
  const wall = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'ຂອບໃຈຜູ້ສະໜັບສະໜູນປີນີ້' }) });

  await expect(wall.getByText('ຜູ້ສະໜັບສະໜູນຫຼັກ')).toBeVisible();
  await expect(wall.getByText('Beerlao')).toBeVisible();
});

test('analytics stays out of the back office, and off without an id', async ({ page }) => {
  // The suite builds without NEXT_PUBLIC_GA_ID, so nothing should be loaded at
  // all here — a test run must never report into the real property.
  await page.goto('/');
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);

  await page.goto('/admin/login');
  expect(
    await page.locator('script[src*="googletagmanager"]').count(),
    'the back office is the team at work, not an audience',
  ).toBe(0);
});

test('every page has exactly one h1', async ({ page }) => {
  for (const route of [
    '/',
    '/awards/2025',
    '/awards/2025/creator-of-the-year',
    '/winners',
    '/submit',
    '/about',
    '/creators/khamla',
  ]) {
    await page.goto(route);
    await expect(page.locator('h1'), route).toHaveCount(1);
  }
});

/**
 * The order of these two is a decision, not an accident, so it is worth a test
 * (PRD §6.1.2, changed in v1.4). A year that has announced its winners is read
 * on the one day everyone arrives at once, and they arrive asking who won —
 * putting the accordions first buries the answer under as many shut rows as
 * the year has categories.
 */
test('a finished year leads with who won, not with the accordions', async ({ page }) => {
  await page.goto('/awards/2025');
  const headings = await page.getByRole('main').locator('h2').allTextContents();
  const table = headings.findIndex((h) => h.includes('ຜູ້ຊະນະທຸກສາຂາ'));
  const categories = headings.findIndex((h) => h.includes('ສາຂາ ແລະ ຜູ້ເຂົ້າຊີງ'));

  expect(table, 'the winners table is on the page').toBeGreaterThan(-1);
  expect(categories, 'the categories are on the page').toBeGreaterThan(-1);
  expect(table, 'the winners table comes first').toBeLessThan(categories);
});

/**
 * There are two ways to reach a 404 and Next answers them at different levels:
 * a URL that matched a route and then called notFound() stops at the site
 * group, and a URL that matched nothing at all goes all the way to the root.
 * With only the group's file in place the second kind fell through to the
 * framework's own unstyled page — no header, no way back, and a Lao site
 * answering in a stock English sentence nobody chose.
 *
 * The count of <main> is the other half. The obvious fix — one file at the
 * root that carries the chrome — puts a second header, footer and <main> on
 * every 404 of the first kind, because the site layout still runs above it.
 */
test('both kinds of wrong URL get the same page', async ({ page }) => {
  for (const route of ['/nope', '/creators/nobody-here', '/awards/1999', '/admin/nope']) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);

    // The page we designed, not the framework's.
    await expect(page.getByRole('heading', { level: 1 }), route).toHaveText('Page not found');
    await expect(page.locator('main'), route).toHaveCount(1);
    // Exact: the closing sentence links the words "home page" as well.
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Home', exact: true }),
      route,
    ).toBeVisible();

    // The header is what makes it a way out rather than a dead end.
    await expect(page.getByRole('banner'), route).toBeVisible();
    await expect(page).toHaveTitle(/^Page not found/, { timeout: 5_000 });
  }
});

/** Reads every JSON-LD block a page emits, keyed by @type. */
async function structuredData(page: import('@playwright/test').Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = blocks.map((block) => JSON.parse(block) as Record<string, unknown>);
  return (type: string) => parsed.find((block) => block['@type'] === type);
}

/**
 * The site is written entirely in Lao script, so what it says about itself in
 * a machine-readable form is doing more work here than it would on an English
 * site: it is most of what a search engine or an assistant has to go on.
 *
 * `sameAs` is the load-bearing part. Without it nothing connects the winner
 * named on this site to the account someone actually follows, and the two stay
 * two different people as far as anything reading the page is concerned.
 */
test('the pages tell a machine who these people are', async ({ page }) => {
  await page.goto('/creators/khamla');
  let find = await structuredData(page);

  const person = find('Person');
  expect(person, 'a creator page describes a person').toBeTruthy();
  expect(person?.sameAs, 'their own accounts are claimed as the same person').toContain(
    'https://facebook.com/khamla',
  );
  expect(find('BreadcrumbList'), 'the trail above the page').toBeTruthy();

  // The category page — the one asked "who was nominated for this" — carried
  // no structured data at all before.
  await page.goto('/awards/2025/creator-of-the-year');
  find = await structuredData(page);
  const list = find('ItemList') as { itemListElement: unknown[]; mainEntity?: { award?: string } };
  expect(list, 'a category is a list of the people in it').toBeTruthy();
  expect(list.itemListElement.length, 'every nominee is listed').toBeGreaterThan(1);
  expect(list.mainEntity?.award, 'and the winner is named as the winner').toContain(
    'ຜູ້ສ້າງສັນແຫ່ງປີ',
  );

  await page.goto('/awards/2025');
  find = await structuredData(page);
  expect(find('Event'), 'a year is an event').toBeTruthy();
  const panel = find('ItemList') as { name: string; itemListElement: unknown[] };
  expect(panel?.name, 'the panel that decided it is on the record too').toContain('ຄະນະກຳມະການ');
  expect(panel.itemListElement.length).toBeGreaterThan(0);

  await page.goto('/winners');
  expect((await structuredData(page))('CollectionPage'), 'the archive').toBeTruthy();
});

/**
 * A picture of a person is worth finding, and a picture nobody described is
 * invisible to an image search. Empty alt is right where the picture sits
 * inside a link that already names them — describing it there makes a screen
 * reader say the name twice — so the rule is about the ones standing alone.
 *
 * The sweep is only as good as the pictures on the page: CI runs with no
 * object storage, so avatars and key visuals are absent there and this passes
 * without proving much. Run locally, where storage is up, it is real.
 */
test('every picture that stands alone says what it is', async ({ page }) => {
  for (const route of ['/', '/awards/2025', '/awards/2025/creator-of-the-year', '/creators/khamla', '/winners']) {
    await page.goto(route);
    const undescribed = await page.locator('img').evaluateAll((images) =>
      images
        .filter((image) => !image.getAttribute('alt'))
        .filter((image) => {
          const link = image.closest('a');
          return !link || !(link.textContent ?? '').trim();
        })
        .map((image) => image.getAttribute('src')?.slice(0, 80)),
    );
    expect(undescribed, route).toEqual([]);
  }
});

/**
 * The map an assistant reads before answering. Written in English on purpose —
 * a question asked as "who won Muan Awards 2025" has nothing to match against
 * a site in Lao script, and this is where the two are introduced.
 */
test('llms.txt says what the site is and where its answers live', async ({ page }) => {
  const response = await page.goto('/llms.txt');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-type']).toContain('text/plain');

  const body = (await response?.text()) ?? '';
  expect(body).toContain('Muan Awards');
  expect(body, 'the URL shapes, so a page can be reached without guessing').toContain(
    '/awards/<year>/<category-slug>',
  );
  expect(body, 'and which years exist').toMatch(/\/awards\/2025/);
});

test('old shared URLs keep working', async ({ page }) => {
  for (const [from, to] of [
    ['/muan/our-projects', '/winners'],
    ['/muan/about-us', '/about'],
    ['/muan/faq', '/about'],
    ['/muan/contact', '/about'],
  ]) {
    await page.goto(from);
    expect(new URL(page.url()).pathname, from).toBe(to);
  }
});

test('Lao text never falls back to a non-Lao font', async ({ page }) => {
  for (const route of ['/', '/awards/2025', '/winners', '/submit', '/about']) {
    await page.goto(route);
    expect(await laoFallbacks(page), route).toEqual([]);
  }
});
