import { api, createHarness, path, type Harness } from './harness';

/**
 * What each phase is allowed to reveal. The dangerous case is the middle one:
 * the team ticks winners into the database before announcing them, so a year
 * at NOMINEES_ANNOUNCED is already holding the result.
 */
describe('public site', () => {
  let h: Harness;
  let editionId: string;
  let categoryId: string;
  let winnerNominationId: string;

  beforeAll(async () => {
    h = await createHarness();

    editionId = (
      await api(h)
        .post(path('/admin/editions'))
        .set(h.auth)
        .send({ year: 2027, slug: '2027', titleLo: 'ມ່ວນ ອະວອດ 2027' })
        .expect(201)
    ).body.data.id;

    categoryId = (
      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ slug: 'creator-of-the-year', nameLo: 'ຜູ້ສ້າງສັນແຫ່ງປີ', isFeatured: true })
        .expect(201)
    ).body.data.id;

    const creators = await Promise.all(
      [
        { slug: 'aaa', nameLo: 'ຄົນ ກ' },
        { slug: 'bbb', nameLo: 'ຄົນ ຂ' },
      ].map((body) => api(h).post(path('/admin/creators')).set(h.auth).send(body).expect(201)),
    );

    const nominations = await Promise.all(
      creators.map((created) =>
        api(h)
          .post(path(`/admin/categories/${categoryId}/nominations`))
          .set(h.auth)
          .send({ creatorId: created.body.data.id })
          .expect(201),
      ),
    );
    winnerNominationId = nominations[0].body.data.id;

    // The winner is decided now, long before it is announced.
    await api(h)
      .patch(path(`/admin/nominations/${winnerNominationId}/winner`))
      .set(h.auth)
      .send({ isWinner: true })
      .expect(200);
  });

  afterAll(() => h.close());

  const advance = (phase: string) =>
    api(h).patch(path(`/admin/editions/${editionId}/phase`)).set(h.auth).send({ phase }).expect(200);

  describe('while the year is a draft', () => {
    it('answers 404 to a stranger, giving nothing away', async () => {
      await api(h).get(path('/editions/2027')).expect(404);
      await api(h).get(path('/editions/2027/categories/creator-of-the-year')).expect(404);
    });

    it('opens for a signed-in admin, flagged as a preview', async () => {
      const response = await api(h).get(path('/editions/2027')).set(h.auth).expect(200);
      expect(response.body.data.preview).toEqual({ phase: 'DRAFT' });
    });

    it('opens for a preview link, and that link unlocks only its own year', async () => {
      const minted = await api(h)
        .post(path(`/admin/editions/${editionId}/preview-token`))
        .set(h.auth)
        .expect(201);
      const token = minted.body.data.token;

      const ok = await api(h).get(path(`/editions/2027?preview=${token}`)).expect(200);
      expect(ok.body.data.preview.phase).toBe('DRAFT');

      const other = (
        await api(h)
          .post(path('/admin/editions'))
          .set(h.auth)
          .send({ year: 2028, slug: '2028', titleLo: 'ງານ 2028' })
          .expect(201)
      ).body.data;
      await api(h).get(path(`/editions/${other.slug}?preview=${token}`)).expect(404);
    });

    it('ignores a forged or expired token', async () => {
      await api(h).get(path('/editions/2027?preview=not-a-token')).expect(404);
    });

    it('shows a draft as it will look once published — no nominees yet', async () => {
      const response = await api(h).get(path('/editions/2027')).set(h.auth).expect(200);
      expect(response.body.data.categories[0].nominees).toEqual([]);
    });
  });

  describe('once published', () => {
    beforeAll(() => advance('PUBLISHED'));

    it('is reachable, with categories but no nominees', async () => {
      const response = await api(h).get(path('/editions/2027')).expect(200);
      expect(response.body.data.preview).toBeNull();
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.categories[0].nominees).toEqual([]);
    });

    it('keeps the creator profile free of an unannounced nomination', async () => {
      const response = await api(h).get(path('/creators/aaa')).expect(200);
      expect(response.body.data.appearances).toEqual([]);
    });

    it('is absent from the hall of winners', async () => {
      const response = await api(h).get(path('/winners')).expect(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('once nominees are announced', () => {
    beforeAll(() => advance('NOMINEES_ANNOUNCED'));

    it('lists the nominees', async () => {
      const response = await api(h).get(path('/editions/2027')).expect(200);
      expect(response.body.data.categories[0].nominees).toHaveLength(2);
    });

    it('does NOT leak the winner that is already in the database', async () => {
      const stored = await h.prisma.nomination.findUnique({ where: { id: winnerNominationId } });
      expect(stored?.isWinner).toBe(true);

      const edition = await api(h).get(path('/editions/2027')).expect(200);
      const flags = edition.body.data.categories[0].nominees.map((n: { isWinner: boolean }) => n.isWinner);
      expect(flags).toEqual([false, false]);

      const category = await api(h).get(path('/editions/2027/categories/creator-of-the-year')).expect(200);
      expect(category.body.data.nominees.every((n: { isWinner: boolean }) => !n.isWinner)).toBe(true);

      const profile = await api(h).get(path('/creators/aaa')).expect(200);
      expect(profile.body.data.appearances[0].isWinner).toBe(false);
    });

    it('still shows nothing in the hall of winners', async () => {
      const response = await api(h).get(path('/winners')).expect(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('once the winners are announced', () => {
    beforeAll(() => advance('WINNERS_ANNOUNCED'));

    it('marks the winner', async () => {
      const response = await api(h).get(path('/editions/2027')).expect(200);
      const winners = response.body.data.categories[0].nominees.filter(
        (n: { isWinner: boolean }) => n.isWinner,
      );
      expect(winners).toHaveLength(1);
      expect(winners[0].creator.slug).toBe('aaa');
    });

    it('adds the year to the hall of winners', async () => {
      const response = await api(h).get(path('/winners')).expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].categories[0].winner.slug).toBe('aaa');
    });

    it('shows the win on the creator profile', async () => {
      const response = await api(h).get(path('/creators/aaa')).expect(200);
      expect(response.body.data.appearances[0]).toMatchObject({ year: 2027, isWinner: true });
    });
  });

  describe('the submission form endpoint', () => {
    it('returns null while nothing is open', async () => {
      const response = await api(h).get(path('/submission-form')).expect(200);
      expect(response.body.data).toBeNull();
    });

    it('returns the open year and its categories once opened', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}/submissions`))
        .set(h.auth)
        .send({ submissionsOpen: true })
        .expect(200);

      const response = await api(h).get(path('/submission-form')).expect(200);
      expect(response.body.data.edition.year).toBe(2027);
      expect(response.body.data.categories).toHaveLength(1);
    });
  });

  describe('the sitemap feed', () => {
    it('lists public years and their categories, and no drafts', async () => {
      const response = await api(h).get(path('/sitemap-entries')).expect(200);
      const slugs = response.body.data.editions.map((e: { slug: string }) => e.slug);
      expect(slugs).toContain('2027');
      expect(slugs).not.toContain('2028');
      expect(response.body.data.creators.map((c: { slug: string }) => c.slug)).toContain('aaa');
    });
  });
});
