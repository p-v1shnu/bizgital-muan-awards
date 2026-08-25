import { api, categoryTemplate, createHarness, path, type Harness } from './harness';

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
      const templateId = await categoryTemplate(h, 'main', 'ສາຂາຫຼັກ');
      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ templateId })
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

  /**
   * Placed before "the submission switch requires a published edition":
   * that block publishes two more years (2031, 2032), and this test's exact
   * expectations only hold while 2030 is still the newest published year.
   */
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

  describe('the submission switch requires a published edition', () => {
    let firstId: string;
    let secondId: string;

    beforeAll(async () => {
      firstId = (await createEdition({ year: 2031, slug: '2031', titleLo: 'ງານ 2031' })).body.data.id;
      secondId = (await createEdition({ year: 2032, slug: '2032', titleLo: 'ງານ 2032' })).body.data.id;
      for (const id of [firstId, secondId]) {
        await api(h).patch(path(`/admin/editions/${id}/phase`)).set(h.auth).send({ phase: 'PUBLISHED' }).expect(200);
      }
    });

    const setSubmissions = (id: string, body: Record<string, unknown>) =>
      api(h).patch(path(`/admin/editions/${id}/submissions`)).set(h.auth).send(body);

    it('refuses to open on a draft year', async () => {
      const draftId = (await createEdition({ year: 2033, slug: '2033', titleLo: 'ງານ 2033' })).body.data
        .id;
      const response = await setSubmissions(draftId, { submissionsOpen: true }).expect(400);
      expect(response.body.message).toContain('PUBLISHED');
    });

    it('opens on a published year', async () => {
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
      const tierId = (
        await api(h)
          .post(path(`/admin/editions/${hostId}/sponsor-tiers`))
          .set(h.auth)
          .send({ nameLo: 'ລະດັບຄຳ' })
          .expect(201)
      ).body.data.id;

      const added = await Promise.all(
        ['Beerlao', 'Lao Telecom'].map((name) =>
          api(h)
            .post(path(`/admin/editions/${hostId}/sponsors`))
            .set(h.auth)
            .send({ name, tierId })
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
   * A field that can be filled in has to be emptiable, or the back office is a
   * one-way door: PRD §7.4 asks the team to clear a finished year's ticket link
   * so the button disappears from the archive instead of pointing at a page
   * that no longer sells anything.
   *
   * The forms used to send `undefined` for a cleared box, which JSON drops
   * entirely and Prisma reads as "leave this column alone".
   */
  /**
   * Sponsor groups are the year's own rows, named by the team. The rules worth
   * holding are the ones that protect a paying sponsor: a logo cannot end up in
   * another year's group, and deleting a group cannot take its logos with it.
   */
  describe('sponsor groups are the year\'s own', () => {
    let yearId: string;
    let otherYearId: string;

    beforeAll(async () => {
      yearId = (await createEdition({ year: 2043, slug: '2043', titleLo: 'ງານ 2043' })).body.data.id;
      otherYearId = (await createEdition({ year: 2044, slug: '2044', titleLo: 'ງານ 2044' })).body.data.id;
    });

    const addTier = (editionId: string, nameLo: string) =>
      api(h)
        .post(path(`/admin/editions/${editionId}/sponsor-tiers`))
        .set(h.auth)
        .send({ nameLo })
        .expect(201);

    it('names its own groups and keeps them in the order they were arranged', async () => {
      const gold = (await addTier(yearId, 'ລະດັບຄຳ')).body.data;
      const media = (await addTier(yearId, 'ສື່ມວນຊົນ')).body.data;

      const reordered = await api(h)
        .post(path(`/admin/editions/${yearId}/sponsor-tiers/reorder`))
        .set(h.auth)
        .send({ items: [{ id: media.id, sortOrder: 0 }, { id: gold.id, sortOrder: 1 }] })
        .expect(200);
      expect(reordered.body.data.map((row: { nameLo: string }) => row.nameLo)).toEqual([
        'ສື່ມວນຊົນ',
        'ລະດັບຄຳ',
      ]);
    });

    it('refuses a logo pointed at another year\'s group', async () => {
      const theirs = (await addTier(otherYearId, 'ລະດັບຄຳ')).body.data;

      await api(h)
        .post(path(`/admin/editions/${yearId}/sponsors`))
        .set(h.auth)
        .send({ name: 'Beerlao', tierId: theirs.id })
        .expect(400);
    });

    it('will not delete a group out from under the logos in it', async () => {
      const tier = (await addTier(yearId, 'ພາດເນີ')).body.data;
      const spare = (await addTier(yearId, 'ຜູ້ສະໜັບສະໜູນ')).body.data;
      const sponsor = (
        await api(h)
          .post(path(`/admin/editions/${yearId}/sponsors`))
          .set(h.auth)
          .send({ name: 'Lao Telecom', tierId: tier.id })
          .expect(201)
      ).body.data;

      // No answer to "where do they go" — refused rather than taking the logo.
      await api(h).delete(path(`/admin/sponsor-tiers/${tier.id}`)).set(h.auth).expect(400);

      // Another year's group is not an answer either.
      const theirs = (await addTier(otherYearId, 'ພາດເນີ')).body.data;
      await api(h)
        .delete(path(`/admin/sponsor-tiers/${tier.id}?moveToTierId=${theirs.id}`))
        .set(h.auth)
        .expect(400);

      await api(h)
        .delete(path(`/admin/sponsor-tiers/${tier.id}?moveToTierId=${spare.id}`))
        .set(h.auth)
        .expect(204);

      const left = await api(h)
        .get(path(`/admin/editions/${yearId}/sponsors`))
        .set(h.auth)
        .expect(200);
      const moved = left.body.data.find((row: { id: string }) => row.id === sponsor.id);
      expect(moved.tierId).toBe(spare.id);
    });

    it('copies last year\'s groups and the logos in them, once', async () => {
      const fresh = (await createEdition({ year: 2045, slug: '2045', titleLo: 'ງານ 2045' })).body.data
        .id;

      const copied = await api(h)
        .post(path(`/admin/editions/${fresh}/sponsor-tiers/copy-from-previous`))
        .set(h.auth)
        .expect(200);
      // 2044 is the year before it, and it has the two groups added above.
      expect(copied.body.data.map((row: { nameLo: string }) => row.nameLo)).toEqual([
        'ລະດັບຄຳ',
        'ພາດເນີ',
      ]);

      // Refused the second time: this is a starting point, not a merge into
      // something the team has already begun arranging.
      await api(h)
        .post(path(`/admin/editions/${fresh}/sponsor-tiers/copy-from-previous`))
        .set(h.auth)
        .expect(400);
    });
  });

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

  /**
   * Placed last on purpose: the "latest" describe block earlier in this file
   * asserts an exact timeline, and any additional PUBLISHED-or-later year
   * created before it runs would break that.
   */
  describe('announcing nominees closes a forgotten switch', () => {
    it('closes automatically, and refuses to reopen behind the announcement', async () => {
      const editionId = (await createEdition({ year: 2050, slug: '2050', titleLo: 'ງານ 2050' })).body
        .data.id;
      const templateId = await categoryTemplate(h, 'auto-close', 'ສາຂາທົດສອບການປິດອັດຕະໂນມັດ');
      const categoryId = (
        await api(h)
          .post(path(`/admin/editions/${editionId}/categories`))
          .set(h.auth)
          .send({ templateId })
          .expect(201)
      ).body.data.id;
      const creator = (
        await api(h)
          .post(path('/admin/creators'))
          .set(h.auth)
          .send({ nameLo: 'ຄົນທົດສອບ', slug: 'test-auto-close' })
          .expect(201)
      ).body.data;
      await api(h)
        .post(path(`/admin/categories/${categoryId}/nominations`))
        .set(h.auth)
        .send({ creatorId: creator.id })
        .expect(201);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);
      await api(h)
        .patch(path(`/admin/editions/${editionId}/submissions`))
        .set(h.auth)
        .send({ submissionsOpen: true })
        .expect(200);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'NOMINEES_ANNOUNCED' })
        .expect(200);

      const after = await api(h).get(path(`/admin/editions/${editionId}`)).set(h.auth).expect(200);
      expect(after.body.data.submissionsOpen).toBe(false);

      const reopen = await api(h)
        .patch(path(`/admin/editions/${editionId}/submissions`))
        .set(h.auth)
        .send({ submissionsOpen: true })
        .expect(400);
      expect(reopen.body.message).toContain('PUBLISHED');

      const audit = await api(h)
        .get(path('/admin/audit?perPage=100&action=edition.submissions.autoclosed'))
        .set(h.auth)
        .expect(200);
      expect(audit.body.data.some((entry: { targetId: string }) => entry.targetId === editionId)).toBe(
        true,
      );
    });
  });

  describe('rolling back an announcement', () => {
    it('jumps back across multiple phases at once, requires a reason, and leaves nominees intact', async () => {
      const editionId = (await createEdition({ year: 2051, slug: '2051', titleLo: 'ງານ 2051' })).body
        .data.id;
      const templateId = await categoryTemplate(h, 'rollback', 'ສາຂາທົດສອບການຖອນ');
      const categoryId = (
        await api(h)
          .post(path(`/admin/editions/${editionId}/categories`))
          .set(h.auth)
          .send({ templateId })
          .expect(201)
      ).body.data.id;
      const creator = (
        await api(h)
          .post(path('/admin/creators'))
          .set(h.auth)
          .send({ nameLo: 'ຄົນທົດສອບຖອນ', slug: 'test-rollback' })
          .expect(201)
      ).body.data;
      const nomination = (
        await api(h)
          .post(path(`/admin/categories/${categoryId}/nominations`))
          .set(h.auth)
          .send({ creatorId: creator.id })
          .expect(201)
      ).body.data;
      await api(h)
        .patch(path(`/admin/nominations/${nomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: true })
        .expect(200);

      for (const phase of ['PUBLISHED', 'NOMINEES_ANNOUNCED', 'WINNERS_ANNOUNCED']) {
        await api(h)
          .patch(path(`/admin/editions/${editionId}/phase`))
          .set(h.auth)
          .send({ phase })
          .expect(200);
      }

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase/rollback`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(400);

      // Forward or sideways is refused — rollback only moves backward, that
      // is what `changePhase` is for.
      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase/rollback`))
        .set(h.auth)
        .send({ phase: 'WINNERS_ANNOUNCED', reason: 'ທົດສອບການປະຕິເສດ' })
        .expect(400);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase/rollback`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED', reason: 'ປະກາດຜິດປີ ຕ້ອງແກ້ໄຂກ່ອນ' })
        .expect(200);

      const after = await api(h).get(path(`/admin/editions/${editionId}`)).set(h.auth).expect(200);
      expect(after.body.data.phase).toBe('PUBLISHED');

      // The winner picked earlier is untouched — a rollback only hides the
      // announcement, it never rewrites what was decided.
      const nominations = await api(h)
        .get(path(`/admin/categories/${categoryId}/nominations`))
        .set(h.auth)
        .expect(200);
      expect(nominations.body.data).toHaveLength(1);
      expect(nominations.body.data[0].isWinner).toBe(true);

      const audit = await api(h)
        .get(path('/admin/audit?perPage=100&action=edition.phase.rolledback'))
        .set(h.auth)
        .expect(200);
      const entry = audit.body.data.find(
        (row: { targetId: string; after: { reason?: string } }) => row.targetId === editionId,
      );
      expect(entry?.after?.reason).toBe('ປະກາດຜິດປີ ຕ້ອງແກ້ໄຂກ່ອນ');
    });

    it('closes the submission switch automatically when rolling all the way back to draft', async () => {
      const editionId = (await createEdition({ year: 2052, slug: '2052', titleLo: 'ງານ 2052' })).body
        .data.id;
      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);
      await api(h)
        .patch(path(`/admin/editions/${editionId}/submissions`))
        .set(h.auth)
        .send({ submissionsOpen: true })
        .expect(200);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase/rollback`))
        .set(h.auth)
        .send({ phase: 'DRAFT', reason: 'ປະກາດຜິດ edition ຕ້ອງເອົາອອກຈາກສາທາລະນະທັງໝົດ' })
        .expect(200);

      const after = await api(h).get(path(`/admin/editions/${editionId}`)).set(h.auth).expect(200);
      expect(after.body.data.phase).toBe('DRAFT');
      expect(after.body.data.submissionsOpen).toBe(false);

      const audit = await api(h)
        .get(path('/admin/audit?perPage=100&action=edition.submissions.autoclosed'))
        .set(h.auth)
        .expect(200);
      expect(audit.body.data.some((entry: { targetId: string }) => entry.targetId === editionId)).toBe(
        true,
      );
    });
  });

  describe('the category list is fixed once nominees are announced', () => {
    it('blocks adding a category — one at a time or copied — and un-blocks it after rolling back', async () => {
      const editionId = (await createEdition({ year: 2053, slug: '2053', titleLo: 'ງານ 2053' })).body
        .data.id;
      const templateId = await categoryTemplate(h, 'lock-test', 'ສາຂາທົດສອບການລັອກ');
      const categoryId = (
        await api(h)
          .post(path(`/admin/editions/${editionId}/categories`))
          .set(h.auth)
          .send({ templateId })
          .expect(201)
      ).body.data.id;
      const creator = (
        await api(h)
          .post(path('/admin/creators'))
          .set(h.auth)
          .send({ nameLo: 'ຄົນທົດສອບລັອກ', slug: 'test-lock' })
          .expect(201)
      ).body.data;
      const nomination = (
        await api(h)
          .post(path(`/admin/categories/${categoryId}/nominations`))
          .set(h.auth)
          .send({ creatorId: creator.id })
          .expect(201)
      ).body.data;
      await api(h)
        .patch(path(`/admin/nominations/${nomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: true })
        .expect(200);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);

      // Still allowed while PUBLISHED — the checklist is only assembled up
      // to this point.
      const secondTemplateId = await categoryTemplate(h, 'lock-test-2', 'ສາຂາທົດສອບການລັອກ 2');
      const secondCategoryId = (
        await api(h)
          .post(path(`/admin/editions/${editionId}/categories`))
          .set(h.auth)
          .send({ templateId: secondTemplateId })
          .expect(201)
      ).body.data.id;
      // Every category needs a nominee before the edition can announce at
      // all — otherwise the pre-existing empty-category rule blocks the
      // phase move below for a reason that has nothing to do with this test.
      await api(h)
        .post(path(`/admin/categories/${secondCategoryId}/nominations`))
        .set(h.auth)
        .send({ creatorId: creator.id })
        .expect(201);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'NOMINEES_ANNOUNCED' })
        .expect(200);

      const thirdTemplateId = await categoryTemplate(h, 'lock-test-3', 'ສາຂາທົດສອບການລັອກ 3');
      const blocked = await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ templateId: thirdTemplateId })
        .expect(400);
      expect(blocked.body.message).toContain('roll the phase back');

      // The bulk "copy from another year" path is the same list-changing
      // action under a different button, so it is refused the same way.
      const otherId = (await createEdition({ year: 2054, slug: '2054', titleLo: 'ງານ 2054' })).body.data
        .id;
      const blockedCopy = await api(h)
        .post(path(`/admin/editions/${editionId}/categories/copy`))
        .set(h.auth)
        .send({ fromEditionId: otherId })
        .expect(400);
      expect(blockedCopy.body.message).toContain('roll the phase back');

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase/rollback`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED', reason: 'ທົດສອບການປົດລັອກຫຼັງຈາກຖອນການປະກາດ' })
        .expect(200);

      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ templateId: thirdTemplateId })
        .expect(201);
    });
  });

  describe('a crowned winner cannot be un-crowned to nobody once announced', () => {
    it('refuses to un-crown once winners are announced, but crowning someone else still works', async () => {
      const editionId = (await createEdition({ year: 2055, slug: '2055', titleLo: 'ງານ 2055' })).body
        .data.id;
      const templateId = await categoryTemplate(h, 'crown-lock', 'ສາຂາທົດສອບການຖອນຜູ້ຊະນະ');
      const categoryId = (
        await api(h)
          .post(path(`/admin/editions/${editionId}/categories`))
          .set(h.auth)
          .send({ templateId })
          .expect(201)
      ).body.data.id;

      const first = (
        await api(h)
          .post(path('/admin/creators'))
          .set(h.auth)
          .send({ nameLo: 'ຄົນທີ 1', slug: 'crown-lock-1' })
          .expect(201)
      ).body.data;
      const second = (
        await api(h)
          .post(path('/admin/creators'))
          .set(h.auth)
          .send({ nameLo: 'ຄົນທີ 2', slug: 'crown-lock-2' })
          .expect(201)
      ).body.data;

      const firstNomination = (
        await api(h)
          .post(path(`/admin/categories/${categoryId}/nominations`))
          .set(h.auth)
          .send({ creatorId: first.id })
          .expect(201)
      ).body.data;
      await api(h)
        .post(path(`/admin/categories/${categoryId}/nominations`))
        .set(h.auth)
        .send({ creatorId: second.id })
        .expect(201);

      await api(h)
        .patch(path(`/admin/nominations/${firstNomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: true })
        .expect(200);

      // Before the announcement, nothing has been shown to anyone yet — free
      // to un-crown here.
      await api(h)
        .patch(path(`/admin/nominations/${firstNomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: false })
        .expect(200);
      await api(h)
        .patch(path(`/admin/nominations/${firstNomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: true })
        .expect(200);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);
      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'NOMINEES_ANNOUNCED' })
        .expect(200);

      // Nominees are public now but winners are not yet — still free to
      // un-crown here.
      await api(h)
        .patch(path(`/admin/nominations/${firstNomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: false })
        .expect(200);
      await api(h)
        .patch(path(`/admin/nominations/${firstNomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: true })
        .expect(200);

      await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'WINNERS_ANNOUNCED' })
        .expect(200);

      const refused = await api(h)
        .patch(path(`/admin/nominations/${firstNomination.id}/winner`))
        .set(h.auth)
        .send({ isWinner: false })
        .expect(400);
      expect(refused.body.message).toContain('roll the phase back');

      const nominations = await api(h)
        .get(path(`/admin/categories/${categoryId}/nominations`))
        .set(h.auth)
        .expect(200);
      expect(nominations.body.data.find((n: { id: string }) => n.id === firstNomination.id)?.isWinner).toBe(
        true,
      );

      // Switching the crown to someone else is a different action — it never
      // leaves the category with nobody — so it stays allowed.
      const secondNominationId = nominations.body.data.find(
        (n: { creatorId: string }) => n.creatorId === second.id,
      ).id;
      await api(h)
        .patch(path(`/admin/nominations/${secondNominationId}/winner`))
        .set(h.auth)
        .send({ isWinner: true })
        .expect(200);

      const afterSwitch = await api(h)
        .get(path(`/admin/categories/${categoryId}/nominations`))
        .set(h.auth)
        .expect(200);
      expect(
        afterSwitch.body.data.find((n: { id: string }) => n.id === firstNomination.id)?.isWinner,
      ).toBe(false);
      expect(afterSwitch.body.data.find((n: { id: string }) => n.id === secondNominationId)?.isWinner).toBe(
        true,
      );
    });
  });
});
