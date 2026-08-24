import { api, categoryTemplate, createHarness, path, type Harness } from './harness';

describe('public submissions and the screening queue', () => {
  let h: Harness;
  let editionId: string;
  let categoryId: string;

  beforeAll(async () => {
    h = await createHarness();
    editionId = (
      await api(h)
        .post(path('/admin/editions'))
        .set(h.auth)
        .send({ year: 2029, slug: '2029', titleLo: 'ງານ 2029' })
        .expect(201)
    ).body.data.id;
    const templateId = await categoryTemplate(h, 'main', 'ສາຂາຫຼັກ');
    categoryId = (
      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ templateId })
        .expect(201)
    ).body.data.id;

    // The submission switch may only turn on for a PUBLISHED edition now.
    await api(h)
      .patch(path(`/admin/editions/${editionId}/phase`))
      .set(h.auth)
      .send({ phase: 'PUBLISHED' })
      .expect(200);
  });

  afterAll(() => h.close());

  /**
   * `from` stands in for a different person. Repeats of one name from one
   * address inside a day collapse to a single entry (PRD §7.1), so a test that
   * means "twenty people nominated her" has to send from twenty addresses —
   * otherwise it is really testing the dedupe rule and getting one row.
   */
  const send = (body: Record<string, unknown>, from = '203.0.113.1') =>
    api(h).post(path('/submissions')).set('X-Forwarded-For', from).send(body);

  it('refuses entries while the form is closed', async () => {
    await send({ categoryId, creatorNameRaw: 'ຄົນໜຶ່ງ' }).expect(403);
  });

  it('accepts entries once the form is open', async () => {
    await api(h)
      .patch(path(`/admin/editions/${editionId}/submissions`))
      .set(h.auth)
      .send({ submissionsOpen: true })
      .expect(200);

    await send({ categoryId, creatorNameRaw: 'ບຸນມີ', reason: 'ເນື້ອຫາດີ' }).expect(201);
  });

  it('answers a honeypot filler as if it worked, and stores nothing', async () => {
    await send({ categoryId, creatorNameRaw: 'ບອດ', website: 'http://spam' }).expect(201);
    const stored = await h.prisma.publicSubmission.count({ where: { creatorNameRaw: 'ບອດ' } });
    expect(stored).toBe(0);
  });

  it('groups repeats of one name into a single row with a count', async () => {
    for (let i = 0; i < 3; i += 1) {
      await send({ categoryId, creatorNameRaw: 'ບຸນມີ' }, `203.0.113.${10 + i}`).expect(201);
    }
    await send({ categoryId, creatorNameRaw: 'ຄົນອື່ນ' }).expect(201);

    const queue = await api(h).get(path('/admin/submissions')).set(h.auth).expect(200);
    expect(queue.body.data).toHaveLength(2);
    expect(queue.body.data[0]).toMatchObject({ creatorNameRaw: 'ບຸນມີ', count: 4 });
  });

  it('needs to be told which creator an entry belongs to', async () => {
    const queue = await api(h).get(path('/admin/submissions')).set(h.auth).expect(200);
    const entryId = queue.body.data[0].entries[0].id;
    await api(h).post(path(`/admin/submissions/${entryId}/accept`)).set(h.auth).send({}).expect(400);
  });

  it('accepting one entry nominates the creator and folds in the duplicates', async () => {
    const queue = await api(h).get(path('/admin/submissions')).set(h.auth).expect(200);
    const group = queue.body.data.find((g: { creatorNameRaw: string }) => g.creatorNameRaw === 'ບຸນມີ');

    const accepted = await api(h)
      .post(path(`/admin/submissions/${group.entries[0].id}/accept`))
      .set(h.auth)
      .send({ newCreatorSlug: 'bounmy' })
      .expect(201);
    expect(accepted.body.data.merged).toBe(3);

    const nominations = await api(h)
      .get(path(`/admin/categories/${categoryId}/nominations`))
      .set(h.auth)
      .expect(200);
    expect(nominations.body.data).toHaveLength(1);
    expect(nominations.body.data[0].creator.slug).toBe('bounmy');
  });

  it('refuses to review the same entry twice', async () => {
    const reviewed = await h.prisma.publicSubmission.findFirst({ where: { status: 'ACCEPTED' } });
    await api(h)
      .post(path(`/admin/submissions/${reviewed!.id}/accept`))
      .set(h.auth)
      .send({ newCreatorSlug: 'another' })
      .expect(400);
  });

  it('rejecting one name rejects its whole cluster', async () => {
    const queue = await api(h).get(path('/admin/submissions')).set(h.auth).expect(200);
    await api(h)
      .post(path(`/admin/submissions/${queue.body.data[0].entries[0].id}/reject`))
      .set(h.auth)
      .expect(201);

    const counts = await api(h).get(path('/admin/submissions/counts')).set(h.auth).expect(200);
    expect(counts.body.data).toMatchObject({ ACCEPTED: 1, MERGED: 3, REJECTED: 1, PENDING: 0 });
  });

  it('stores the submitter IP hashed, never in the clear', async () => {
    const row = await h.prisma.publicSubmission.findFirst();
    expect(row?.ipHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('counts the same name from the same address on the same day only once', async () => {
    const one = { categoryId, creatorNameRaw: 'ສົ່ງຊ້ຳ' };
    await send(one, '198.51.100.7').expect(201);
    await send(one, '198.51.100.7').expect(201);
    await send(one, '198.51.100.7').expect(201);

    // The repeats answer 201 like any other entry — a person pressing the
    // button twice should not be told off — but only one row exists.
    expect(await h.prisma.publicSubmission.count({ where: { creatorNameRaw: 'ສົ່ງຊ້ຳ' } })).toBe(1);

    // Someone else nominating her still counts.
    await send(one, '198.51.100.8').expect(201);
    expect(await h.prisma.publicSubmission.count({ where: { creatorNameRaw: 'ສົ່ງຊ້ຳ' } })).toBe(2);
  });

  /**
   * The rules held when requests arrived one at a time; the night of the
   * awards is not that. These fire together on purpose.
   */
  describe('when two things happen at the same instant', () => {
    it('stores one entry when the same name is sent three times at once', async () => {
      const body = { categoryId, creatorNameRaw: 'ພ້ອມກັນ' };
      const sent = await Promise.all(
        [0, 1, 2].map(() =>
          api(h).post(path('/submissions')).set('X-Forwarded-For', '198.51.100.60').send(body),
        ),
      );

      // Every sender is told it worked — none of them did anything wrong.
      expect(sent.map((r) => r.status)).toEqual([201, 201, 201]);
      expect(await h.prisma.publicSubmission.count({ where: { creatorNameRaw: 'ພ້ອມກັນ' } })).toBe(1);
    });

    it('answers the second click on "accept" with a conflict, not a crash', async () => {
      await api(h)
        .post(path('/submissions'))
        .set('X-Forwarded-For', '198.51.100.61')
        .send({ categoryId, creatorNameRaw: 'ກົດສອງເທື່ອ' })
        .expect(201);

      const entry = await h.prisma.publicSubmission.findFirst({
        where: { creatorNameRaw: 'ກົດສອງເທື່ອ' },
        select: { id: true },
      });

      const both = await Promise.all(
        [0, 1].map(() =>
          api(h)
            .post(path(`/admin/submissions/${entry!.id}/accept`))
            .set(h.auth)
            .send({ newCreatorSlug: 'double-click-probe' }),
        ),
      );

      const codes = both.map((r) => r.status).sort();
      expect(codes[0]).toBe(201);
      // The loser explains itself instead of throwing: a 4xx, never a 500.
      expect(codes[1]).toBeGreaterThanOrEqual(400);
      expect(codes[1]).toBeLessThan(500);
      expect(
        await h.prisma.nomination.count({ where: { categoryId, creator: { slug: 'double-click-probe' } } }),
      ).toBe(1);
    });

    it('turns a duplicate slug into a conflict rather than an unhandled error', async () => {
      const created = await Promise.all(
        [0, 1].map(() =>
          api(h)
            .post(path('/admin/creators'))
            .set(h.auth)
            .send({ slug: 'same-slug-twice', nameLo: 'ຊື່ຄືກັນ' }),
        ),
      );
      const codes = created.map((r) => r.status).sort();
      expect(codes).toEqual([201, 409]);
    });
  });

  /**
   * PRD §7.2's third button. Grouping is by exact name, so one creator sent in
   * under two spellings arrives as two groups — which no automatic rule can
   * join, because only a person knows they are the same person.
   */
  describe('folding one spelling into another', () => {
    let categoryId: string;
    let first: string;
    let second: string;

    const send = (name: string, from: string) =>
      api(h)
        .post(path('/submissions'))
        .set('X-Forwarded-For', from)
        .send({ categoryId, creatorNameRaw: name })
        .expect(201);

    const pendingGroups = async () => {
      const response = await api(h).get(path('/admin/submissions')).set(h.auth).expect(200);
      return response.body.data as {
        creatorNameRaw: string;
        count: number;
        category: { id: string };
        entries: { id: string; originalNameRaw: string | null }[];
      }[];
    };

    beforeAll(async () => {
      const categories = await api(h)
        .get(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .expect(200);
      categoryId = categories.body.data[0].id;

      await send('ຄຳຫຼ້າ ສີສຸວັນ', '203.0.113.1');
      await send('ຄຳຫຼ້າ ສີສຸວັນ', '203.0.113.2');
      await send('คำหล้า สีสุวัน', '203.0.113.3');

      const groups = await pendingGroups();
      first = groups.find((g) => g.creatorNameRaw === 'ຄຳຫຼ້າ ສີສຸວັນ')!.entries[0].id;
      second = groups.find((g) => g.creatorNameRaw === 'คำหล้า สีสุวัน')!.entries[0].id;
    });

    it('starts as two groups, which is the problem', async () => {
      const groups = await pendingGroups();
      const lao = groups.find((g) => g.creatorNameRaw === 'ຄຳຫຼ້າ ສີສຸວັນ');
      const thai = groups.find((g) => g.creatorNameRaw === 'คำหล้า สีสุวัน');
      expect(lao?.count).toBe(2);
      expect(thai?.count).toBe(1);
    });

    it('refuses to merge across categories', async () => {
      const elsewhereTemplateId = await categoryTemplate(h, 'elsewhere', 'ສາຂາອື່ນ');
      const other = await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ templateId: elsewhereTemplateId })
        .expect(201);
      await api(h)
        .post(path('/submissions'))
        .set('X-Forwarded-For', '203.0.113.4')
        .send({ categoryId: other.body.data.id, creatorNameRaw: 'ຄຳຫຼ້າ ສີສຸວັນ' })
        .expect(201);

      const groups = await pendingGroups();
      const elsewhere = groups.find((g) => g.category.id === other.body.data.id)!;

      await api(h)
        .post(path(`/admin/submissions/${elsewhere.entries[0].id}/merge`))
        .set(h.auth)
        .send({ intoSubmissionId: first })
        .expect(400);
    });

    it('makes them one group, and remembers what was typed', async () => {
      const merged = await api(h)
        .post(path(`/admin/submissions/${second}/merge`))
        .set(h.auth)
        .send({ intoSubmissionId: first })
        .expect(201);
      expect(merged.body.data.merged).toBe(1);

      const groups = await pendingGroups();
      expect(groups.find((g) => g.creatorNameRaw === 'คำหล้า สีสุวัน')).toBeUndefined();

      const joined = groups.find((g) => g.creatorNameRaw === 'ຄຳຫຼ້າ ສີສຸວັນ');
      expect(joined?.count).toBe(3);

      const moved = joined!.entries.find((entry) => entry.id === second);
      expect(moved?.originalNameRaw).toBe('คำหล้า สีสุวัน');
    });

    it('accepting the joined group takes all three entries with it', async () => {
      const groups = await pendingGroups();
      const joined = groups.find((g) => g.creatorNameRaw === 'ຄຳຫຼ້າ ສີສຸວັນ')!;

      await api(h)
        .post(path(`/admin/submissions/${joined.entries[0].id}/accept`))
        .set(h.auth)
        .send({ newCreatorSlug: 'khamla-merged' })
        .expect(201);

      // Scoped to this category: the cross-category test above deliberately
      // left a group of the same name sitting in another one.
      const after = await pendingGroups();
      expect(
        after.find((g) => g.category.id === categoryId && g.creatorNameRaw === 'ຄຳຫຼ້າ ສີສຸວັນ'),
      ).toBeUndefined();
    });
  });
});
