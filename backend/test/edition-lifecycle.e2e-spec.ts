import { api, createHarness, path, type Harness } from './harness';

/** The rules of PRD §4 — the ones that decide what the public can see. */
describe('edition lifecycle', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  const createEdition = (body: Record<string, unknown>) =>
    api(h).post(path('/admin/editions')).set(h.auth).send(body);

  describe('phase moves forward only', () => {
    let editionId: string;

    beforeAll(async () => {
      const created = await createEdition({ year: 2030, slug: '2030', titleLo: 'ງານ 2030' }).expect(201);
      editionId = created.body.data.id;
      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ slug: 'main', nameLo: 'ສາຂາຫຼັກ' })
        .expect(201);
    });

    it('starts as a draft the public cannot see', async () => {
      const list = await api(h).get(path('/editions')).expect(200);
      expect(list.body.data).toHaveLength(0);
      await api(h).get(path('/editions/2030')).expect(404);
    });

    it('publishes once it has categories', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);

      const list = await api(h).get(path('/editions')).expect(200);
      expect(list.body.data).toHaveLength(1);
    });

    it('refuses to go back to draft', async () => {
      const response = await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'DRAFT' })
        .expect(400);
      expect(response.body.message).toContain('Cannot move a published edition back');
    });

    /**
     * PRD §4.3.3: most of the checklist warns, this one locks. A category
     * announced with nobody in it tells the public a prize exists and has no
     * shortlist, and opens on an empty heading.
     *
     * The message has to name the categories, because the way out is to remove
     * them — a year copied from a bigger one arrives with headings that drew no
     * entries, and "two categories have no nominees" leaves the team hunting.
     */
    it('refuses to announce nominees while a category is empty, and names it', async () => {
      const response = await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'NOMINEES_ANNOUNCED' })
        .expect(400);

      expect(response.body.message).toContain('have no nominees');
      // Naming them matters: "two categories" leaves the team hunting through
      // twenty headings for which two.
      expect(response.body.message).toContain('delete the category');
    });

    it('lets the announcement through once the empty category is removed', async () => {
      const categories = await api(h)
        .get(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .expect(200);

      const empty = categories.body.data.filter(
        (category: { _count?: { nominations: number } }) =>
          (category._count?.nominations ?? 0) === 0,
      );
      expect(empty.length).toBeGreaterThan(0);

      for (const category of empty) {
        await api(h).delete(path(`/admin/categories/${category.id}`)).set(h.auth).expect(204);
      }

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'NOMINEES_ANNOUNCED' })
        .expect(200);
    });

    it('refuses to delete a published edition', async () => {
      await api(h).delete(path(`/admin/editions/${editionId}`)).set(h.auth).expect(400);
    });
  });

  describe('backfilling an old year', () => {
    it('may be created straight at its final phase', async () => {
      const created = await createEdition({
        year: 2019,
        slug: '2019',
        titleLo: 'ງານ 2019',
        phase: 'WINNERS_ANNOUNCED',
      }).expect(201);
      expect(created.body.data.phase).toBe('WINNERS_ANNOUNCED');
      // ...and without ever having opened its submission form.
      expect(created.body.data.submissionsOpen).toBe(false);
    });

    it('rejects a duplicate year and a duplicate slug', async () => {
      await createEdition({ year: 2019, slug: 'other', titleLo: 'x' }).expect(409);
      await createEdition({ year: 2018, slug: '2019', titleLo: 'x' }).expect(409);
    });
  });

  describe('the submission switch is independent of phase', () => {
    let firstId: string;
    let secondId: string;

    beforeAll(async () => {
      firstId = (await createEdition({ year: 2031, slug: '2031', titleLo: 'ງານ 2031' })).body.data.id;
      secondId = (await createEdition({ year: 2032, slug: '2032', titleLo: 'ງານ 2032' })).body.data.id;
    });

    const setSubmissions = (id: string, body: Record<string, unknown>) =>
      api(h).patch(path(`/admin/editions/${id}/submissions`)).set(h.auth).send(body);

    it('opens on a draft year — phase is not involved', async () => {
      await setSubmissions(firstId, { submissionsOpen: true }).expect(200);
      const open = await api(h).get(path('/editions/accepting-submissions')).expect(200);
      expect(open.body.data.year).toBe(2031);
    });

    it('closes every other year when one opens', async () => {
      await setSubmissions(secondId, { submissionsOpen: true }).expect(200);
      const open = await api(h).get(path('/editions/accepting-submissions')).expect(200);
      expect(open.body.data.year).toBe(2032);

      const first = await api(h).get(path(`/admin/editions/${firstId}`)).set(h.auth).expect(200);
      expect(first.body.data.submissionsOpen).toBe(false);
    });

    it('records the year it closed as a side effect', async () => {
      const audit = await api(h)
        .get(path('/admin/audit?perPage=100&action=edition.submissions.closed'))
        .set(h.auth)
        .expect(200);
      expect(audit.body.data.some((entry: { targetId: string }) => entry.targetId === firstId)).toBe(true);
    });

    it('rejects a close date already in the past', async () => {
      await setSubmissions(secondId, {
        submissionsOpen: true,
        submissionsCloseAt: '2020-01-01T00:00:00.000Z',
      }).expect(400);
    });

    it('treats an elapsed close date as closed, with no scheduler', async () => {
      await h.prisma.edition.update({
        where: { id: secondId },
        data: { submissionsCloseAt: new Date(Date.now() - 60_000) },
      });
      const open = await api(h).get(path('/editions/accepting-submissions')).expect(200);
      expect(open.body.data).toBeNull();
    });
  });

  describe('"latest" means three different things (§4.3.1)', () => {
    it('separates the nav, the winners strip and the timeline', async () => {
      // 2030 is PUBLISHED, 2019 has winners. The newest year overall is not
      // the newest year with results — which is exactly the trap.
      const nav = await api(h).get(path('/editions/latest')).expect(200);
      const strip = await api(h).get(path('/editions/latest-winners')).expect(200);
      const timeline = await api(h).get(path('/editions')).expect(200);

      expect(nav.body.data.year).toBe(2030);
      expect(strip.body.data.year).toBe(2019);
      expect(timeline.body.data.map((e: { year: number }) => e.year)).toEqual([2030, 2019]);
    });
  });

  /**
   * Both lists are shown in an order the team chooses, so both need a way to
   * save one. The API had the field but no endpoint to set it in bulk, and the
   * back office had no control at all — the order was whatever creation order
   * happened to be.
   */
  describe('the panel and the sponsor wall keep the order the team sets', () => {
    let hostId: string;
    let otherId: string;

    beforeAll(async () => {
      hostId = (await createEdition({ year: 2041, slug: '2041', titleLo: 'ງານ 2041' })).body.data.id;
      otherId = (await createEdition({ year: 2042, slug: '2042', titleLo: 'ງານ 2042' })).body.data.id;
    });

    it('reorders judges within one edition, and refuses another edition’s row', async () => {
      const people = await Promise.all(
        ['ກຳມະການ ກ', 'ກຳມະການ ຂ'].map((nameLo) =>
          api(h)
            .post(path('/admin/judges'))
            .set(h.auth)
            .send({ nameLo, positionLo: 'ຜູ້ຊ່ຽວຊານ' })
            .expect(201),
        ),
      );
      const assignments = await Promise.all(
        people.map((person) =>
          api(h)
            .post(path(`/admin/editions/${hostId}/judges`))
            .set(h.auth)
            .send({ judgeId: person.body.data.id, role: 'MEMBER' })
            .expect(201),
        ),
      );
      const [a, b] = assignments.map((assignment) => assignment.body.data.id);

      const reordered = await api(h)
        .post(path(`/admin/editions/${hostId}/judges/reorder`))
        .set(h.auth)
        .send({ items: [{ id: b, sortOrder: 0 }, { id: a, sortOrder: 1 }] })
        .expect(200);
      expect(reordered.body.data.map((row: { id: string }) => row.id)).toEqual([b, a]);

      await api(h)
        .post(path(`/admin/editions/${otherId}/judges/reorder`))
        .set(h.auth)
        .send({ items: [{ id: a, sortOrder: 0 }] })
        .expect(400);
    });

    it('reorders sponsors within one edition', async () => {
      const tier = await api(h)
        .post(path(`/admin/editions/${hostId}/sponsor-tiers`))
        .set(h.auth)
        .send({ nameLo: 'ລະດັບຄຳ' })
        .expect(201);

      const added = await Promise.all(
        ['Beerlao', 'Lao Telecom'].map((name) =>
          api(h)
            .post(path(`/admin/editions/${hostId}/sponsors`))
            .set(h.auth)
            .send({ name, tierId: tier.body.data.id })
            .expect(201),
        ),
      );
      const [first, second] = added.map((sponsor) => sponsor.body.data.id);

      const reordered = await api(h)
        .post(path(`/admin/editions/${hostId}/sponsors/reorder`))
        .set(h.auth)
        .send({ items: [{ id: second, sortOrder: 0 }, { id: first, sortOrder: 1 }] })
        .expect(200);
      expect(reordered.body.data.map((row: { id: string }) => row.id)).toEqual([second, first]);
    });
  });

  /**
   * The tier headings over the sponsor logos were six values in an enum, so the
   * words lived in the code — in two copies of the same Lao list, one in the
   * back office and one on the year page. They are the year's own rows now.
   *
   * A new year starts with none deliberately: seeding six defaults would put
   * the copy straight back into the code. The copy button is how last year's
   * list arrives, exactly as it does for categories.
   */
  describe('sponsor tiers are the year’s own list', () => {
    let editionId: string;
    let lastYearId: string;
    let lastYearTitle: string;

    beforeAll(async () => {
      editionId = (await createEdition({ year: 2043, slug: '2043', titleLo: 'ງານ 2043' })).body.data.id;
      lastYearId = (await createEdition({ year: 2044, slug: '2044', titleLo: 'ງານ 2044' })).body.data.id;

      // One at a time, not Promise.all: a new tier lands at the end by reading
      // the highest sortOrder in use, so two creates racing can both land on the
      // same number — and then "last year's order" is whatever MySQL felt like.
      // The copy test below asserts that order, and this is what made it flaky.
      const tiers = [];
      for (const nameLo of ['ຜູ້ສະໜັບສະໜູນຫຼັກ', 'ລະດັບຄຳ']) {
        tiers.push(
          await api(h)
            .post(path(`/admin/editions/${lastYearId}/sponsor-tiers`))
            .set(h.auth)
            .send({ nameLo })
            .expect(201),
        );
      }
      lastYearTitle = tiers[0].body.data.id;
    });

    it('starts with none, and refuses a sponsor that names no tier', async () => {
      const list = await api(h)
        .get(path(`/admin/editions/${editionId}/sponsor-tiers`))
        .set(h.auth)
        .expect(200);
      expect(list.body.data).toEqual([]);

      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsors`))
        .set(h.auth)
        .send({ name: 'Beerlao' })
        .expect(400);
    });

    /**
     * The foreign key alone would allow this: both rows exist, and nothing in
     * the database says they belong to the same year. The year page would then
     * print a heading that is not in its own tier list.
     */
    it('refuses a sponsor filed under another year’s tier', async () => {
      const response = await api(h)
        .post(path(`/admin/editions/${editionId}/sponsors`))
        .set(h.auth)
        .send({ name: 'Beerlao', tierId: lastYearTitle })
        .expect(400);
      expect(response.body.message).toContain('from this edition');
    });

    it('refuses a second tier with the same name in one year', async () => {
      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsor-tiers`))
        .set(h.auth)
        .send({ nameLo: 'ພາດເນີ' })
        .expect(201);
      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsor-tiers`))
        .set(h.auth)
        .send({ nameLo: 'ພາດເນີ' })
        .expect(409);
    });

    it('copies last year’s list and skips the names already here', async () => {
      // 'ພາດເນີ' is already on 2043 from the test above; the copy must not
      // fail on it, and must not duplicate it either.
      await api(h)
        .post(path(`/admin/editions/${lastYearId}/sponsor-tiers`))
        .set(h.auth)
        .send({ nameLo: 'ພາດເນີ' })
        .expect(201);

      const copied = await api(h)
        .post(path(`/admin/editions/${editionId}/sponsor-tiers/copy`))
        .set(h.auth)
        .send({ fromEditionId: lastYearId })
        .expect(201);
      expect(copied.body.data).toEqual({ copied: 2, skipped: 1 });

      const list = await api(h)
        .get(path(`/admin/editions/${editionId}/sponsor-tiers`))
        .set(h.auth)
        .expect(200);
      // Appended after what was here, in last year's order — not interleaved.
      expect(list.body.data.map((tier: { nameLo: string }) => tier.nameLo)).toEqual([
        'ພາດເນີ',
        'ຜູ້ສະໜັບສະໜູນຫຼັກ',
        'ລະດັບຄຳ',
      ]);

      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsor-tiers/copy`))
        .set(h.auth)
        .send({ fromEditionId: editionId })
        .expect(400);
    });

    /**
     * The point of the whole change: the heading a visitor reads comes out of
     * the database, and a rename in the back office reaches the page.
     */
    it('prints the tier names on the year page, in the order the team sets', async () => {
      const tiers = (
        await api(h).get(path(`/admin/editions/${editionId}/sponsor-tiers`)).set(h.auth).expect(200)
      ).body.data as { id: string; nameLo: string }[];
      const gold = tiers.find((tier) => tier.nameLo === 'ລະດັບຄຳ')!;
      const partner = tiers.find((tier) => tier.nameLo === 'ພາດເນີ')!;

      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsors`))
        .set(h.auth)
        .send({ name: 'Lao Telecom', tierId: gold.id })
        .expect(201);
      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsors`))
        .set(h.auth)
        .send({ name: 'LNR', tierId: partner.id })
        .expect(201);

      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ slug: 'main', nameLo: 'ສາຂາຫຼັກ' })
        .expect(201);
      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);

      const shown = async () =>
        (await api(h).get(path('/editions/2043')).expect(200)).body.data.sponsors as {
          name: string;
          tier: { nameLo: string };
        }[];

      // Gold sits above partner in the tier list, so its logos come first.
      expect((await shown()).map((sponsor) => [sponsor.tier.nameLo, sponsor.name])).toEqual([
        ['ພາດເນີ', 'LNR'],
        ['ລະດັບຄຳ', 'Lao Telecom'],
      ]);

      await api(h)
        .post(path(`/admin/editions/${editionId}/sponsor-tiers/reorder`))
        .set(h.auth)
        .send({ items: [{ id: gold.id, sortOrder: 0 }, { id: partner.id, sortOrder: 1 }] })
        .expect(200);
      expect((await shown()).map((sponsor) => sponsor.name)).toEqual(['Lao Telecom', 'LNR']);

      // A rename is copy editing, not a migration: same rows, new heading.
      await api(h)
        .patch(path(`/admin/sponsor-tiers/${gold.id}`))
        .set(h.auth)
        .send({ nameLo: 'ລະດັບຄຳ 2043' })
        .expect(200);
      expect((await shown())[0].tier.nameLo).toBe('ລະດັບຄຳ 2043');
    });

    it('refuses to delete a tier that still holds logos, and allows it once empty', async () => {
      const tiers = (
        await api(h).get(path(`/admin/editions/${editionId}/sponsor-tiers`)).set(h.auth).expect(200)
      ).body.data as { id: string; nameLo: string; _count: { sponsors: number } }[];
      const held = tiers.find((tier) => tier._count.sponsors > 0)!;

      const refused = await api(h)
        .delete(path(`/admin/sponsor-tiers/${held.id}`))
        .set(h.auth)
        .expect(400);
      expect(refused.body.message).toContain('Move the 1 sponsor(s)');

      const sponsors = (
        await api(h).get(path(`/admin/editions/${editionId}/sponsors`)).set(h.auth).expect(200)
      ).body.data as { id: string; tierId: string }[];
      const inTheWay = sponsors.find((sponsor) => sponsor.tierId === held.id)!;
      await api(h).delete(path(`/admin/sponsors/${inTheWay.id}`)).set(h.auth).expect(204);

      await api(h).delete(path(`/admin/sponsor-tiers/${held.id}`)).set(h.auth).expect(204);
    });
  });

  /**
   * A field that can be filled in has to be emptiable, or the back office is a
   * one-way door: PRD §7.4 asks the team to clear a finished year's ticket link
   * so the button disappears from the archive instead of pointing at a page
   * that no longer sells anything.
   *
   * The forms used to send `undefined` for a cleared box, which JSON drops
   * entirely and Prisma reads as "leave this column alone".
   */
  describe('clearing a field that was filled in', () => {
    let editionId: string;

    beforeAll(async () => {
      editionId = (
        await api(h)
          .post(path('/admin/editions'))
          .set(h.auth)
          .send({
            year: 2046,
            slug: '2046',
            titleLo: 'ປີທົດສອບການລຶບ',
            ticketUrl: 'https://tickets.example.com/2041',
            venueLo: 'ຫໍປະຊຸມແຫ່ງຊາດ',
            eventDate: '2046-11-20T12:00:00.000Z',
          })
          .expect(201)
      ).body.data.id;
    });

    it('empties a link, a place and a date when null is sent', async () => {
      const cleared = await api(h)
        .patch(path(`/admin/editions/${editionId}`))
        .set(h.auth)
        .send({ ticketUrl: null, venueLo: null, eventDate: null })
        .expect(200);

      expect(cleared.body.data.ticketUrl).toBeNull();
      expect(cleared.body.data.venueLo).toBeNull();
      // Not 1970: `new Date(null)` is the epoch, and folding "clear this" in
      // with "set this" would have written that date onto the year page.
      expect(cleared.body.data.eventDate).toBeNull();
    });

    it('still leaves a field alone when it is simply not mentioned', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}`))
        .set(h.auth)
        .send({ ticketUrl: 'https://tickets.example.com/again' })
        .expect(200);

      const untouched = await api(h)
        .patch(path(`/admin/editions/${editionId}`))
        .set(h.auth)
        .send({ titleLo: 'ຊື່ໃໝ່' })
        .expect(200);

      expect(untouched.body.data.ticketUrl).toBe('https://tickets.example.com/again');
    });
  });
});
