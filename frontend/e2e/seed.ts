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

  // Already seeded by an earlier run.
  const existing = await (await api.get('editions')).json();
  if ((existing.data ?? []).length >= 2) {
    await purge();
    return;
  }

  await api.put('admin/site', {
    headers: auth,
    data: {
      brandStatementLo: 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ ທີ່ຄັດເລືອກໂດຍຄະນະກຳມະການ',
      aboutSummaryLo: 'ມ່ວນ ອະວອດ ຄືເວທີປະຈຳປີທີ່ຍ້ອງຍໍຜົນງານຂອງຜູ້ສ້າງສັນຄອນເທັນລາວ ໃນທຸກຮູບແບບ',
    },
  });

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
        titleLo: `ມ່ວນ ອະວອດ ${year}`,
        descriptionLo: `ງານມອບລາງວັນປະຈຳປີ ${year}`,
        venueLo: 'ຫໍປະຊຸມແຫ່ງຊາດ, ນະຄອນຫຼວງວຽງຈັນ',
        activitiesLo: 'ຍ່າງພົມແດງ\nການສະແດງເປີດງານ\nປະກາດຜົນລາງວັນ',
      },
    });
    const editionId = (await edition.json()).data.id;

    for (const [slug, nameLo, isFeatured] of [
      ['creator-of-the-year', 'ຜູ້ສ້າງສັນແຫ່ງປີ', true],
      ['video-of-the-year', 'ວິດີໂອແຫ່ງປີ', true],
      ['food', 'ຄອນເທັນອາຫານ', false],
    ] as const) {
      const category = await api.post(`admin/editions/${editionId}/categories`, {
        headers: auth,
        data: { slug, nameLo, isFeatured, descriptionLo: 'ມອບໃຫ້ຜົນງານທີ່ໂດດເດັ່ນທີ່ສຸດຂອງປີ' },
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

    await api.post(`admin/editions/${editionId}/judges`, {
      headers: auth,
      data: { judgeId, role: 'CHAIR' },
    });
    await api.post(`admin/editions/${editionId}/sponsors`, {
      headers: auth,
      data: { name: 'Beerlao', tier: 'TITLE' },
    });

    for (const phase of ['PUBLISHED', 'NOMINEES_ANNOUNCED', 'WINNERS_ANNOUNCED']) {
      await api.patch(`admin/editions/${editionId}/phase`, { headers: auth, data: { phase } });
      if (phase === finalPhase) break;
    }

    if (year === 2026) {
      await api.patch(`admin/editions/${editionId}/submissions`, {
        headers: auth,
        data: { submissionsOpen: true },
      });
      await api.patch(`admin/editions/${editionId}`, {
        headers: auth,
        data: { ticketUrl: 'https://tickets.example.la', voteUrl: 'https://vote.example.la' },
      });
    }
  }

  await purge();
}
