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
  await page.locator('form input').first().fill('ນັກສ້າງສັນ ທົດສອບ');
  await page.locator('form textarea').fill('ຜົນງານດີຕະຫຼອດປີ');
  await page.locator('form button[type=submit]').click();

  await expect(page.getByText('ຮັບຊື່ແລ້ວ')).toBeVisible();
});

test('the form suggests names already in the library', async ({ page }) => {
  await page.goto('/submit');

  const name = page.locator('form input').first();
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
