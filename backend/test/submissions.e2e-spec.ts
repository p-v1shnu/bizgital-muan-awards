import { api, createHarness, path, type Harness } from './harness';

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
    categoryId = (
      await api(h)
        .post(path(`/admin/editions/${editionId}/categories`))
        .set(h.auth)
        .send({ slug: 'main', nameLo: 'ສາຂາຫຼັກ' })
        .expect(201)
    ).body.data.id;
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
});
