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

    it('refuses to announce nominees while a category is empty', async () => {
      const response = await api(h)
        .patch(path(`/admin/editions/${editionId}/phase`))
        .set(h.auth)
        .send({ phase: 'NOMINEES_ANNOUNCED' })
        .expect(400);
      expect(response.body.message).toContain('no nominees');
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
});
