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

    /**
     * PRD §4.3.2 promises a signed-in admin can simply open the year. The page
     * is rendered on the server, which cannot reach the access token the back
     * office keeps in memory — the refresh cookie is the only credential a
     * server render can see, so it has to be enough on its own.
     */
    it('opens for the cookie alone, which is all a server-rendered page has', async () => {
      const login = await api(h)
        .post(path('/auth/login'))
        .set('X-Forwarded-For', '198.51.100.60')
        .send({ email: h.admin.email, password: h.admin.password })
        .expect(200);
      const cookie = login.headers['set-cookie'];

      const response = await api(h).get(path('/editions/2027')).set('Cookie', cookie).expect(200);
      expect(response.body.data.preview).toEqual({ phase: 'DRAFT' });

      // And it stops working the moment that session is signed out.
      await api(h)
        .post(path('/auth/logout'))
        .set({ Authorization: `Bearer ${login.body.data.accessToken}` })
        .expect(204);
      await api(h).get(path('/editions/2027')).set('Cookie', cookie).expect(404);
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

    it('carries the night’s programme through to the public page', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}`))
        .set(h.auth)
        .send({ activitiesLo: 'ຍ່າງພົມແດງ\nການສະແດງເປີດງານ' })
        .expect(200);

      const response = await api(h).get(path('/editions/2027')).expect(200);
      expect(response.body.data.activitiesLo).toBe('ຍ່າງພົມແດງ\nການສະແດງເປີດງານ');
    });

    it('keeps the photos of the night, in the order they were arranged', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}`))
        .set(h.auth)
        .send({ galleryImageKeys: ['editions/b.jpg', 'editions/a.jpg'] })
        .expect(200);

      const response = await api(h).get(path('/editions/2027')).expect(200);
      expect(response.body.data.galleryImageKeys).toEqual(['editions/b.jpg', 'editions/a.jpg']);
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

  /**
   * Three states, because two were not enough (PRD §4.2). A bare null meant
   * the page could only ever say "not open yet", including to somebody who
   * arrived the day after the deadline — told to wait for a thing that had
   * already been and gone.
   */
  describe('the submission form endpoint', () => {
    it('says nothing has ever opened, when nothing has', async () => {
      const response = await api(h).get(path('/submission-form')).expect(200);
      expect(response.body.data.state).toBe('never-opened');
    });

    it('returns the open year and its categories once opened', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}/submissions`))
        .set(h.auth)
        .send({ submissionsOpen: true })
        .expect(200);

      const response = await api(h).get(path('/submission-form')).expect(200);
      expect(response.body.data.state).toBe('open');
      expect(response.body.data.edition.year).toBe(2027);
      expect(response.body.data.categories).toHaveLength(1);
    });

    it('names the year that closed, rather than saying it never opened', async () => {
      await api(h)
        .patch(path(`/admin/editions/${editionId}/submissions`))
        .set(h.auth)
        .send({ submissionsOpen: false })
        .expect(200);

      const response = await api(h).get(path('/submission-form')).expect(200);
      expect(response.body.data.state).toBe('closed');
      expect(response.body.data.edition.year).toBe(2027);
    });
  });

  /**
   * The dangerous year is not the draft — it is the one that is *published*
   * while its shortlist is still being decided. Its page is live, its
   * categories are readable, and the nominations already sit in the database.
   * Everything counted or listed from a nomination has to stay quiet until the
   * announcement, and this year is the one that proves it: the test used to
   * run against a draft, which any check would have passed.
   */
  describe('a published year whose nominees are not announced yet', () => {
    beforeAll(async () => {
      const hidden = (
        await api(h)
          .post(path('/admin/editions'))
          .set(h.auth)
          .send({ year: 2030, slug: '2030', titleLo: 'ງານ 2030' })
          .expect(201)
      ).body.data.id;
      const hiddenCategory = (
        await api(h)
          .post(path(`/admin/editions/${hidden}/categories`))
          .set(h.auth)
          .send({ slug: 'secret', nameLo: 'ສາຂາລັບ' })
          .expect(201)
      ).body.data.id;
      const secret = (
        await api(h)
          .post(path('/admin/creators'))
          .set(h.auth)
          .send({ slug: 'ccc', nameLo: 'ຄົນ ລັບ' })
          .expect(201)
      ).body.data.id;
      await api(h)
        .post(path(`/admin/categories/${hiddenCategory}/nominations`))
        .set(h.auth)
        .send({ creatorId: secret })
        .expect(201);

      // Live to the public — categories and panel readable, shortlist not.
      await api(h)
        .patch(path(`/admin/editions/${hidden}/phase`))
        .set(h.auth)
        .send({ phase: 'PUBLISHED' })
        .expect(200);
    });

    it('is readable as a year, so this is not passing by being hidden', async () => {
      const response = await api(h).get(path('/editions/2030')).expect(200);
      expect(response.body.data.categories).toHaveLength(1);
      // The category is there; the people in it are not.
      expect(response.body.data.categories[0].nominees).toEqual([]);
    });

    it('needs at least two characters before the form suggests anything', async () => {
      const response = await api(h).get(path('/creator-suggestions?q=ຄ')).expect(200);
      expect(response.body.data).toEqual([]);
    });

    it('does not suggest a name that is only on the unannounced shortlist', async () => {
      const response = await api(h).get(path('/creator-suggestions?q=ຄົນ')).expect(200);
      const names = response.body.data.map((row: { nameLo: string }) => row.nameLo);
      expect(names).toContain('ຄົນ ກ');
      expect(names).not.toContain('ຄົນ ລັບ');
    });

    it('does not put their page in the sitemap, which is where it read first', async () => {
      const response = await api(h).get(path('/sitemap-entries')).expect(200);
      const slugs = response.body.data.creators.map((c: { slug: string }) => c.slug);
      expect(slugs).not.toContain('ccc');
    });

    it('does not move the running total on the homepage', async () => {
      const response = await api(h).get(path('/stats')).expect(200);
      // ຄົນ ກ and ຄົນ ຂ are announced; ຄົນ ລັບ is not.
      expect(response.body.data.creators).toBe(2);
    });
  });

  /**
   * The contact box on /about is what the privacy section points a submitter at
   * when they ask to be forgotten, so the channels have to survive the trip from
   * the back office to the public payload — and a mistyped address has to be
   * refused at the door rather than become a dead mailto: link on the page.
   */
  describe('the team contact channels', () => {
    it('reaches the public payload once the team fills it in', async () => {
      await api(h)
        .put(path('/admin/site'))
        .set(h.auth)
        .send({ contactEmail: 'info@muanawards.la', contactPhone: '020 5555 5555' })
        .expect(200);

      const response = await api(h).get(path('/site')).expect(200);
      expect(response.body.data.contactEmail).toBe('info@muanawards.la');
      expect(response.body.data.contactPhone).toBe('020 5555 5555');
    });

    it('refuses an address that is not one', async () => {
      await api(h)
        .put(path('/admin/site'))
        .set(h.auth)
        .send({ contactEmail: 'ຕິດຕໍ່ພວກເຮົາ' })
        .expect(400);
    });

    it('takes an emptied field as emptied, not as unchanged', async () => {
      await api(h)
        .put(path('/admin/site'))
        .set(h.auth)
        .send({ contactEmail: null, contactPhone: null })
        .expect(200);

      const response = await api(h).get(path('/site')).expect(200);
      expect(response.body.data.contactEmail).toBeNull();
      expect(response.body.data.contactPhone).toBeNull();
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
