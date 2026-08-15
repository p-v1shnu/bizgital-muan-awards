import { expect, test } from '@playwright/test';

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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ມ່ວນ ອະວອດ');
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
    expect(body, 'the category list belongs to a year').not.toContain('ຄອນເທັນອາຫານ');
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
    await expect(main.getByRole('heading', { name: 'ສາຍຄອນເທັນ' })).toBeVisible();
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

  test('an unknown year is a 404, not an error', async ({ page }) => {
    const response = await page.goto('/awards/2099');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('ບໍ່ພົບໜ້ານີ້')).toBeVisible();
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
  expect(body, '2026 has not announced results').not.toContain('ມ່ວນ ອະວອດ 2026');
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
    await page.goto(path, { waitUntil: 'networkidle' });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
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
