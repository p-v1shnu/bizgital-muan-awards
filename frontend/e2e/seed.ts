import { request } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api/v1';
export const ADMIN = { email: 'admin@muanawards.com', password: 'a-very-long-password' };

/**
 * Puts two believable years in front of the browser: 2025 finished with
 * results, 2026 published and taking entries. Between them they exercise
 * every phase the public pages have to distinguish.
 *
 * Idempotent — a second run signs in instead of setting up, so the suite can
 * be re-run against a database that is already seeded.
 */
export default async function seed() {
  // A trailing slash on the base and relative paths below: with a leading
  // slash the URL join would drop the /api/v1 prefix entirely.
  const api = await request.newContext({ baseURL: `${API}/` });

  const setup = await api.post('auth/setup', {
    data: { ...ADMIN, name: 'Muan Admin' },
  });
  if (!setup.ok()) {
    const login = await api.post('auth/login', { data: ADMIN });
    if (!login.ok()) throw new Error(`Could not sign in to seed: ${login.status()}`);
  }

  const session = setup.ok() ? await setup.json() : await (await api.post('auth/login', { data: ADMIN })).json();
  const auth = { Authorization: `Bearer ${session.data.accessToken}` };

  /**
   * The public pages cache, and the site is normally built before this runs —
   * so its pages are prerendered from an empty database. Clearing them is the
   * last thing every path here does, including the already-seeded one: a
   * re-run against a fresh build would otherwise read the empty snapshot.
   */
  const purge = async () => {
    const site = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
    const secret = process.env.REVALIDATE_SECRET;
    if (secret) {
      await api.post(`${site}/api/revalidate`, { headers: { 'x-revalidate-secret': secret } });
    }
    await api.dispose();
  };

  // The site-level content the public pages are read against. Written on every
  // seed, not only the first: a database seeded before a field existed has
  // nothing in it, so the spec for that field fails on a re-run for a reason
  // that has nothing to do with the page. CI starts empty and never sees this;
  // a laptop that has run the suite before sees it every time a field is added.
  await api.put('admin/site', {
    headers: auth,
    data: {
      brandStatementLo: 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັ້ນລາວ ທີ່ຄັດເລືອກໂດຍຄະນະກຳມະການ',
      aboutSummaryLo: 'ມ່ວນອາວອດສ໌ ຄືເວທີປະຈຳປີທີ່ຍ້ອງຍໍຜົນງານຂອງຜູ້ສ້າງສັນຄອນເທັ້ນລາວ ໃນທຸກຮູບແບບ',
      // The contact box on /about, and — separately, for the footer's icon row
      // — the organisation's own Facebook page.
      contactEmail: 'info@muanawards.la',
      contactPhone: '020 5555 5555',
      socialLinks: { facebook: 'https://facebook.com/muanawards' },
      // What Google reads. Deliberately not the pages' own fallbacks, so the spec
      // can tell which of the two reached the browser.
      pageSeo: {
        about: {
          titleLo: 'ກ່ຽວກັບງານ ມ່ວນອາວອດສ໌',
          descriptionLo: 'ທີ່ມາຂອງງານ, ເກນການຕັດສິນ ແລະ ຄຳຖາມທີ່ພົບເລື້ອຍ',
        },
      },
      footerLocationLo: 'ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ',
      // Every card state a fresh install comes up with (backend/prisma/seed.ts),
      // so the browser and any screenshot taken from it show what the team will
      // actually see rather than a half-filled stand-in.
      homeCards: {
        noYear: { titleLo: 'ງານປີຕໍ່ໄປ', bodyLo: 'ຈະປະກາດໃນໄວໆນີ້' },
        draft: { titleLo: 'ກຳລັງຕຽມການ' },
        published: { titleLo: 'ເປີດແລ້ວ', bodyLo: 'ເບິ່ງສາຂາ ແລະ ລາຍລະອຽດຂອງງານປີນີ້' },
        nominees: { titleLo: 'ປະກາດຜູ້ເຂົ້າຊີງແລ້ວ', bodyLo: 'ເບິ່ງລາຍຊື່ຜູ້ເຂົ້າຊີງທຸກສາຂາ' },
        winners: { titleLo: 'ປະກາດຜົນແລ້ວ', bodyLo: 'ເບິ່ງຜູ້ຊະນະທຸກສາຂາຂອງປີນີ້' },
        entriesOpen: {
          titleLo: 'ເປີດຮັບສະເໜີຊື່ແລ້ວ',
          bodyLo: 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ',
        },
        hallOfWinners: { bodyLo: 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ນັບແຕ່ປີທຳອິດ' },
      },
      // Deliberately not the page's own three lines: the spec asserts these two
      // exactly, which is what proves the list is read from here and not from
      // the fallback still sitting in the page.
      submitAfterLo: 'ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື\nຜົນຕັດສິນມາຈາກຄະນະກຳມະການ',
      // The judging steps, which the homepage band and /about both render — the
      // spec reads them off both pages and compares.
      judgingSteps: [
        { titleLo: 'ສະເໜີຊື່', bodyLo: 'ເປີດໃຫ້ທຸກຄົນສົ່ງຊື່ຜ່ານໜ້າ “ສົ່ງລາຍຊື່”' },
        { titleLo: 'ຄັດກອງ', bodyLo: 'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີ' },
        { titleLo: 'ກຳມະການລົງຄະແນນ', bodyLo: 'ຄະນະກຳມະການລົງຄະແນນເປັນເອກະລາດ' },
        { titleLo: 'ປະກາດຜົນ', bodyLo: 'ປະກາດຜູ້ເຂົ້າຊີງກ່ອນ ແລ້ວປະກາດຜູ້ຊະນະໃນງານ' },
      ],
      // The FAQ, questions and all — the same five entries a fresh install comes
      // up with (backend/prisma/seed.ts), so the browser reads what the team
      // will actually see rather than a stand-in list. The third answer has two
      // paragraphs, which is the page's only multi-paragraph layout to check.
      faq: [
        {
          questionLo: 'ໃຜສາມາດສະເໜີຊື່ໄດ້?',
          answerLo: 'ທຸກຄົນ — ບໍ່ຕ້ອງລົງທະບຽນ ແລະ ບໍ່ຕ້ອງບອກຊື່ຜູ້ສົ່ງ',
        },
        {
          questionLo: 'ຈຳນວນຄັ້ງທີ່ຖືກສະເໜີ ມີຜົນຕໍ່ຜົນລາງວັນບໍ?',
          answerLo: 'ບໍ່ມີ — ການສະເໜີຊື່ຊ່ວຍໃຫ້ທີມງານບໍ່ເບິ່ງຂ້າມໃຜ ແຕ່ຜູ້ຕັດສິນຄືຄະນະກຳມະການ',
        },
        {
          questionLo: 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊີງມີຫຍັງແດ່?',
          answerLo:
            'ຜູ້ສ້າງສັນຄອນເທັ້ນລາວ ຫຼື ຄົນທີ່ອາໄສຢູ່ ສປປ ລາວ\nມີຜົນງານເຜີຍແຜ່ໃນຮອບປີທີ່ຕັດສິນ',
        },
        {
          questionLo: 'ຄະນະກຳມະການເລືອກມາແນວໃດ?',
          answerLo: 'ທີມງານເຊີນຄະນະກຳມະການເອງທຸກປີ ຈາກຄົນທຳງານໃນວົງການ',
        },
        {
          questionLo: 'ຢາກຮ່ວມເປັນຜູ້ສະໜັບສະໜູນ ຕິດຕໍ່ໃສ?',
          answerLo: 'ຕິດຕໍ່ທີມງານຕາມຊ່ອງທາງໃນຫົວຂໍ້ “ຕິດຕໍ່ທີມງານ” ທ້າຍໜ້ານີ້',
        },
      ],
    },
  });

  // Already seeded by an earlier run — but two fixtures are switches that the
  // specs themselves flip (entries open, the ticket link) and restore. A run
  // killed part-way leaves them the wrong way round and eight later tests fail
  // for a reason that has nothing to do with them, so they are re-established
  // on every seed rather than only on the first.
  const existing = await (await api.get('editions')).json();
  if ((existing.data ?? []).length >= 2) {
    const seeded = existing.data.find((row: { year: number }) => row.year === 2026);
    if (seeded) await openEntriesOn(api, auth, seeded.id);
    await purge();
    return;
  }

  const creators: Record<string, string> = {};
  for (const [slug, nameLo] of [
    ['khamla', 'ຄຳຫຼ້າ ສີສຸວັນ'],
    ['nangnoi', 'ນາງນ້ອຍ ວົງສະຫວັນ'],
    ['somphone', 'ສົມພອນ ແກ້ວມະນີ'],
    ['douangjai', 'ດວງໃຈ ພົມມະຈັນ'],
  ]) {
    const created = await api.post('admin/creators', {
      headers: auth,
      data: { slug, nameLo, socialLinks: { facebook: `https://facebook.com/${slug}` } },
    });
    creators[slug] = (await created.json()).data.id;
  }

  const judge = await api.post('admin/judges', {
    headers: auth,
    data: { nameLo: 'ທ່ານ ສົມສັກ ພົມມະວົງ', positionLo: 'ຜູ້ອຳນວຍການ, Muan Media' },
  });
  const judgeId = (await judge.json()).data.id;

  for (const [year, finalPhase] of [
    [2025, 'WINNERS_ANNOUNCED'],
    [2026, 'PUBLISHED'],
  ] as const) {
    const edition = await api.post('admin/editions', {
      headers: auth,
      data: {
        year,
        slug: String(year),
        titleLo: `ມ່ວນອາວອດສ໌ ${year}`,
        descriptionLo: `ງານມອບລາງວັນປະຈຳປີ ${year}`,
        venueLo: 'ຫໍປະຊຸມແຫ່ງຊາດ, ນະຄອນຫຼວງວຽງຈັນ',
        activitiesLo: 'ຍ່າງພົມແດງ\nການສະແດງເປີດງານ\nປະກາດຜົນລາງວັນ',
      },
    });
    const editionId = (await edition.json()).data.id;

    for (const [slug, nameLo, isFeatured, groupLo] of [
      ['creator-of-the-year', 'ຜູ້ສ້າງສັນແຫ່ງປີ', true, 'ສາຍຄອນເທັ້ນ'],
      ['video-of-the-year', 'ວິດີໂອແຫ່ງປີ', true, 'ສາຍຄອນເທັ້ນ'],
      ['food', 'ຄອນເທັ້ນອາຫານ', false, 'ສາຍໄລຟ໌ສະໄຕລ໌'],
    ] as const) {
      const category = await api.post(`admin/editions/${editionId}/categories`, {
        headers: auth,
        data: {
          slug,
          nameLo,
          isFeatured,
          groupLo,
          descriptionLo: 'ມອບໃຫ້ຜົນງານທີ່ໂດດເດັ່ນທີ່ສຸດຂອງປີ',
        },
      });
      const categoryId = (await category.json()).data.id;

      const nominationIds: string[] = [];
      for (const creatorId of Object.values(creators)) {
        const nomination = await api.post(`admin/categories/${categoryId}/nominations`, {
          headers: auth,
          data: { creatorId },
        });
        nominationIds.push((await nomination.json()).data.id);
      }

      // The winner is decided now, well before it is announced — which is
      // exactly what the phase-gating specs need to catch.
      if (finalPhase === 'WINNERS_ANNOUNCED') {
        await api.patch(`admin/nominations/${nominationIds[0]}/winner`, {
          headers: auth,
          data: { isWinner: true },
        });
      }
    }

    /**
     * A long year, because the rules that only bite at scale (PRD §7.6) cannot
     * be seen with three categories: the winners table folds past twelve rows,
     * and the form grows a filter box past fifteen options. These carry one
     * nominee each so the seed stays quick.
     */
    const extras = year === 2025 ? 10 : 13;
    for (let index = 0; index < extras; index += 1) {
      const category = await api.post(`admin/editions/${editionId}/categories`, {
        headers: auth,
        data: {
          slug: `award-${index + 1}`,
          nameLo: `ສາຂາເພີ່ມເຕີມ ${index + 1}`,
          groupLo: 'ສາຂາອື່ນໆ',
        },
      });
      const categoryId = (await category.json()).data.id;

      const nomination = await api.post(`admin/categories/${categoryId}/nominations`, {
        headers: auth,
        data: { creatorId: Object.values(creators)[index % 4] },
      });
      if (finalPhase === 'WINNERS_ANNOUNCED') {
        await api.patch(`admin/nominations/${(await nomination.json()).data.id}/winner`, {
          headers: auth,
          data: { isWinner: true },
        });
      }
    }

    await api.post(`admin/editions/${editionId}/judges`, {
      headers: auth,
      data: { judgeId, role: 'CHAIR' },
    });
    // Sponsor groups are the year's own rows now, named by the team, so the seed
    // makes one and puts the logo in it — the same two steps the back office does.
    const tier = await api.post(`admin/editions/${editionId}/sponsor-tiers`, {
      headers: auth,
      data: { nameLo: 'ຜູ້ສະໜັບສະໜູນຫຼັກ' },
    });
    await api.post(`admin/editions/${editionId}/sponsors`, {
      headers: auth,
      data: { name: 'Beerlao', tierId: (await tier.json()).data.id },
    });

    for (const phase of ['PUBLISHED', 'NOMINEES_ANNOUNCED', 'WINNERS_ANNOUNCED']) {
      await api.patch(`admin/editions/${editionId}/phase`, { headers: auth, data: { phase } });
      if (phase === finalPhase) break;
    }

    if (year === 2026) await openEntriesOn(api, auth, editionId);
  }

  await purge();
}

/** The two fixtures the specs are allowed to change and expected to put back. */
async function openEntriesOn(
  api: Awaited<ReturnType<typeof request.newContext>>,
  auth: Record<string, string>,
  editionId: string,
) {
  await api.patch(`admin/editions/${editionId}/submissions`, {
    headers: auth,
    data: { submissionsOpen: true },
  });
  await api.patch(`admin/editions/${editionId}`, {
    headers: auth,
    data: { ticketUrl: 'https://tickets.example.la', voteUrl: 'https://vote.example.la' },
  });
}
