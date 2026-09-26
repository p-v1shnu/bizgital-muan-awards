import { api, categoryTemplate, createHarness, path, type Harness } from './harness';

/**
 * Ways an admin could lose data or put the public site into a state the
 * phase rules exist to prevent — each one found by trying it, not by reading
 * the rule. They sit together because they share one question: does every
 * route that changes something respect the same guards as the route built
 * for it?
 */
describe('admin integrity guards', () => {
  let h: Harness;
  let editionId: string;
  let categoryId: string;

  const send = (body: Record<string, unknown>, from: string) =>
    api(h).post(path('/submissions')).set('X-Forwarded-For', from).send({ reasonTags: ['creativity'], ...body });

  const newCategory = async (edition: string, slug: string) =>
    (
      await api(h)
        .post(path(`/admin/editions/${edition}/categories`))
        .set(h.auth)
        .send({ templateId: await categoryTemplate(h, slug, slug.toUpperCase()) })
        .expect(201)
    ).body.data.id as string;

  const newCreator = async (slug: string) =>
    (await api(h).post(path('/admin/creators')).set(h.auth).send({ slug, nameLo: slug }).expect(201)).body.data
      .id as string;

  const nominate = async (category: string, creatorId: string) =>
    (await api(h).post(path(`/admin/categories/${category}/nominations`)).set(h.auth).send({ creatorId }).expect(201))
      .body.data.id as string;

  const toPhase = (edition: string, phase: string) =>
    api(h).patch(path(`/admin/editions/${edition}/phase`)).set(h.auth).send({ phase });

  beforeAll(async () => {
    h = await createHarness();
    editionId = (
      await api(h).post(path('/admin/editions')).set(h.auth).send({ year: 2033, slug: '2033', titleLo: 'ງານ 2033' }).expect(201)
    ).body.data.id;
    categoryId = await newCategory(editionId, 'integrity-main');
    await toPhase(editionId, 'PUBLISHED').expect(200);
    await api(h).patch(path(`/admin/editions/${editionId}/submissions`)).set(h.auth).send({ submissionsOpen: true }).expect(200);
  });
  afterAll(() => h.close());

  it('refuses to delete a category that still holds public submissions', async () => {
    const holding = await newCategory(editionId, 'integrity-holding');
    for (let i = 0; i < 3; i += 1) {
      await send({ categoryId: holding, creatorNameRaw: 'ຜູ້ສົ່ງ' }, `198.51.100.${i + 1}`).expect(201);
    }

    await api(h).delete(path(`/admin/categories/${holding}`)).set(h.auth).expect(400);
    expect(await h.prisma.publicSubmission.count({ where: { categoryId: holding } })).toBe(3);
  });

  it('still deletes a category whose entries were all rejected, keeping them in the audit log', async () => {
    // A year copied from the last one keeps headings that drew only spam; the
    // announce check tells the team to delete them, so that has to work.
    const spam = await newCategory(editionId, 'integrity-spam');
    await send({ categoryId: spam, creatorNameRaw: 'ສະແປມ' }, '198.51.100.40').expect(201);
    const entry = await h.prisma.publicSubmission.findFirstOrThrow({ where: { categoryId: spam } });
    await api(h).post(path(`/admin/submissions/${entry.id}/reject`)).set(h.auth).expect(201);

    await api(h).delete(path(`/admin/categories/${spam}`)).set(h.auth).expect(204);

    const audit = await h.prisma.auditLog.findFirstOrThrow({ where: { action: 'category.deleted', targetId: spam } });
    expect(JSON.stringify(audit.before)).toContain('ສະແປມ');
  });

  it('refuses a revoked creator on the accept path too', async () => {
    const creatorId = await newCreator('integrity-revoked-accept');
    await api(h).post(path(`/admin/creators/${creatorId}/revoke`)).set(h.auth).send({ reason: 'ລະເມີດເງື່ອນໄຂ' }).expect(201);
    await send({ categoryId, creatorNameRaw: 'ຖືກຖອດ' }, '198.51.100.41').expect(201);
    const entry = await h.prisma.publicSubmission.findFirstOrThrow({ where: { creatorNameRaw: 'ຖືກຖອດ' } });

    await api(h).post(path(`/admin/submissions/${entry.id}/accept`)).set(h.auth).send({ creatorId }).expect(400);
    expect(await h.prisma.nomination.count({ where: { creatorId } })).toBe(0);
  });

  it('refuses to delete an announced winner, the same as it refuses to un-crown one', async () => {
    const edition = (
      await api(h).post(path('/admin/editions')).set(h.auth).send({ year: 2034, slug: '2034', titleLo: 'ງານ 2034' }).expect(201)
    ).body.data.id;
    const category = await newCategory(edition, 'integrity-winner');
    const winner = await nominate(category, await newCreator('integrity-winner-1'));
    const runnerUp = await nominate(category, await newCreator('integrity-winner-2'));
    await toPhase(edition, 'NOMINEES_ANNOUNCED').expect(200);
    await api(h).patch(path(`/admin/nominations/${winner}/winner`)).set(h.auth).send({ isWinner: true }).expect(200);
    await toPhase(edition, 'WINNERS_ANNOUNCED').expect(200);

    await api(h).delete(path(`/admin/nominations/${winner}`)).set(h.auth).expect(400);
    // The rest of the shortlist is not the result anyone saw, and stays editable.
    await api(h).delete(path(`/admin/nominations/${runnerUp}`)).set(h.auth).expect(204);
    expect(await h.prisma.nomination.count({ where: { id: winner } })).toBe(1);
  });

  it('refuses to nominate a revoked creator, and does not count one when announcing', async () => {
    const edition = (
      await api(h).post(path('/admin/editions')).set(h.auth).send({ year: 2035, slug: '2035', titleLo: 'ງານ 2035' }).expect(201)
    ).body.data.id;
    const category = await newCategory(edition, 'integrity-revoked');
    const creatorId = await newCreator('integrity-revoked-1');
    await nominate(category, creatorId);
    await api(h).post(path(`/admin/creators/${creatorId}/revoke`)).set(h.auth).send({ reason: 'ລະເມີດເງື່ອນໄຂ' }).expect(201);

    // Their only nominee is hidden from the public, so the category is empty
    // as far as anyone outside can tell.
    await toPhase(edition, 'NOMINEES_ANNOUNCED').expect(400);

    const other = await newCategory(edition, 'integrity-revoked-other');
    await api(h).post(path(`/admin/categories/${other}/nominations`)).set(h.auth).send({ creatorId }).expect(400);
  });

  it('keeps what each sender typed when groups are merged more than once', async () => {
    await send({ categoryId, creatorNameRaw: 'AAA' }, '203.0.113.1').expect(201);
    await send({ categoryId, creatorNameRaw: 'BBB' }, '203.0.113.2').expect(201);
    await send({ categoryId, creatorNameRaw: 'CCC' }, '203.0.113.3').expect(201);
    const a = await h.prisma.publicSubmission.findFirstOrThrow({ where: { creatorNameRaw: 'AAA' } });
    const b = await h.prisma.publicSubmission.findFirstOrThrow({ where: { creatorNameRaw: 'BBB' } });
    const c = await h.prisma.publicSubmission.findFirstOrThrow({ where: { creatorNameRaw: 'CCC' } });

    await api(h).post(path(`/admin/submissions/${a.id}/merge`)).set(h.auth).send({ intoSubmissionId: b.id }).expect(201);
    await api(h).post(path(`/admin/submissions/${b.id}/merge`)).set(h.auth).send({ intoSubmissionId: c.id }).expect(201);

    const rows = await h.prisma.publicSubmission.findMany({ where: { id: { in: [a.id, b.id, c.id] } } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(a.id)).toMatchObject({ creatorNameRaw: 'CCC', originalNameRaw: 'AAA' });
    expect(byId.get(b.id)).toMatchObject({ creatorNameRaw: 'CCC', originalNameRaw: 'BBB' });
    expect(byId.get(c.id)).toMatchObject({ creatorNameRaw: 'CCC', originalNameRaw: null });
  });

  it('leaves no stray creator behind when the same entry is accepted twice at once', async () => {
    await send({ categoryId, creatorNameRaw: 'ກົດສອງເທື່ອ' }, '192.0.2.50').expect(201);
    const entry = await h.prisma.publicSubmission.findFirstOrThrow({ where: { creatorNameRaw: 'ກົດສອງເທື່ອ' } });

    const answers = await Promise.all([
      api(h).post(path(`/admin/submissions/${entry.id}/accept`)).set(h.auth).send({ newCreatorSlug: 'twice-a' }),
      api(h).post(path(`/admin/submissions/${entry.id}/accept`)).set(h.auth).send({ newCreatorSlug: 'twice-b' }),
    ]);

    expect(answers.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await h.prisma.creator.count({ where: { slug: { in: ['twice-a', 'twice-b'] } } })).toBe(1);
  });

  it('answers 400, not 500, to null on a required field', async () => {
    const creatorId = await newCreator('integrity-null');
    await api(h).patch(path(`/admin/editions/${editionId}`)).set(h.auth).send({ titleLo: null }).expect(400);
    await api(h).patch(path(`/admin/editions/${editionId}`)).set(h.auth).send({ year: null }).expect(400);
    await api(h).patch(path(`/admin/creators/${creatorId}`)).set(h.auth).send({ nameLo: null }).expect(400);
    await api(h).patch(path(`/admin/creators/${creatorId}`)).set(h.auth).send({ slug: null }).expect(400);
  });

  it('refuses the slugs the fixed public routes already answer to', async () => {
    for (const slug of ['latest', 'latest-winners', 'accepting-submissions']) {
      await api(h).post(path('/admin/editions')).set(h.auth).send({ year: 2040, slug, titleLo: 'x' }).expect(400);
      await api(h).patch(path(`/admin/editions/${editionId}`)).set(h.auth).send({ slug }).expect(400);
    }
  });

  it('keeps a creator or judge profile hidden until a year that names them is public', async () => {
    // Shortlisted in a year whose nominees are not announced: the year page
    // and the sitemap already hide them, and a 200 on a guessed slug told
    // anyone who was in the running.
    const creatorId = await newCreator('integrity-unannounced');
    await nominate(categoryId, creatorId);
    await api(h).get(path('/creators/integrity-unannounced')).expect(404);

    const draft = (
      await api(h).post(path('/admin/editions')).set(h.auth).send({ year: 2036, slug: '2036', titleLo: 'ງານ 2036' }).expect(201)
    ).body.data.id;
    const judgeId = (
      await api(h)
        .post(path('/admin/judges'))
        .set(h.auth)
        .send({ slug: 'integrity-draft-judge', nameLo: 'ກຳມະການ', positionLo: 'ຜູ້ຊ່ຽວຊານ' })
        .expect(201)
    ).body.data.id;
    await api(h).post(path(`/admin/editions/${draft}/judges`)).set(h.auth).send({ judgeId }).expect(201);
    await api(h).get(path('/judges/integrity-draft-judge')).expect(404);
  });

  it('answers a repeated or nested suggestion query without a server error', async () => {
    // Anyone can send these, and every 500 counts toward the error alarm.
    await api(h).get(path('/creator-suggestions?q=ab&q=cd')).expect(200);
    await api(h).get(path('/creator-suggestions?q[x]=abc')).expect(200);
  });
});
