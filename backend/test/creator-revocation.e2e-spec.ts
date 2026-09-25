import { api, categoryTemplate, createHarness, path, type Harness } from './harness';

/**
 * A revoked creator's nomination/winner history disappears from the public
 * site — everywhere, every year — without the underlying rows changing
 * (Creator.revokedAt in schema.prisma has the full reasoning).
 */
describe('creator revocation', () => {
  let h: Harness;
  let plainAdmin: { Authorization: string };
  let editionId: string;
  let categorySlug: string;
  let editionSlug: string;
  let creatorId: string;
  let creatorSlug: string;
  let nominationId: string;

  beforeAll(async () => {
    h = await createHarness();

    await api(h)
      .post(path('/admin/users'))
      .set(h.auth)
      .send({ email: 'editor@test.local', password: 'another-long-password', name: 'Editor', role: 'ADMIN' })
      .expect(201);
    const login = await api(h)
      .post(path('/auth/login'))
      .send({ email: 'editor@test.local', password: 'another-long-password' })
      .expect(200);
    plainAdmin = { Authorization: `Bearer ${login.body.data.accessToken}` };

    editionSlug = '2031';
    const edition = await api(h)
      .post(path('/admin/editions'))
      .set(h.auth)
      .send({ year: 2031, slug: editionSlug, titleLo: 'ງານ 2031' })
      .expect(201);
    editionId = edition.body.data.id;

    const templateId = await categoryTemplate(h, 'revocation-main', 'ສາຂາຫຼັກ');
    const category = await api(h)
      .post(path(`/admin/editions/${editionId}/categories`))
      .set(h.auth)
      .send({ templateId })
      .expect(201);
    categorySlug = category.body.data.slug;

    const creator = await api(h)
      .post(path('/admin/creators'))
      .set(h.auth)
      .send({ nameLo: 'ຄົນຖືກຖອດຖອນ', slug: 'to-be-revoked' })
      .expect(201);
    creatorId = creator.body.data.id;
    creatorSlug = creator.body.data.slug;

    const nomination = await api(h)
      .post(path(`/admin/categories/${category.body.data.id}/nominations`))
      .set(h.auth)
      .send({ creatorId })
      .expect(201);
    nominationId = nomination.body.data.id;

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
    // A winner can only be picked once the shortlist is announced.
    await api(h)
      .patch(path(`/admin/nominations/${nominationId}/winner`))
      .set(h.auth)
      .send({ isWinner: true })
      .expect(200);
    await api(h)
      .patch(path(`/admin/editions/${editionId}/phase`))
      .set(h.auth)
      .send({ phase: 'WINNERS_ANNOUNCED' })
      .expect(200);
  });

  afterAll(() => h.close());

  it('is visible everywhere before being revoked', async () => {
    await api(h).get(path(`/creators/${creatorSlug}`)).expect(200);

    const category = await api(h).get(path(`/editions/${editionSlug}/categories/${categorySlug}`)).expect(200);
    expect(category.body.data.nominees).toHaveLength(1);

    const winners = await api(h).get(path('/winners')).expect(200);
    const year = winners.body.data.find((e: { year: number }) => e.year === 2031);
    expect(year.categories[0].winner.slug).toBe(creatorSlug);
  });

  it('refuses a plain admin', async () => {
    await api(h)
      .post(path(`/admin/creators/${creatorId}/revoke`))
      .set(plainAdmin)
      .send({ reason: 'ລະເມີດເງື່ອນໄຂ' })
      .expect(403);
  });

  it('requires a real reason', async () => {
    await api(h)
      .post(path(`/admin/creators/${creatorId}/revoke`))
      .set(h.auth)
      .send({ reason: 'ok' })
      .expect(400);
  });

  it('hides the creator everywhere on the public site once revoked, without touching the nomination', async () => {
    await api(h)
      .post(path(`/admin/creators/${creatorId}/revoke`))
      .set(h.auth)
      .send({ reason: 'ລະເມີດເງື່ອນໄຂການເຂົ້າຊີງ' })
      .expect(201);

    await api(h).get(path(`/creators/${creatorSlug}`)).expect(404);

    const category = await api(h).get(path(`/editions/${editionSlug}/categories/${categorySlug}`)).expect(200);
    expect(category.body.data.nominees).toHaveLength(0);

    // The category simply has no winner — the same answer a not-yet-decided
    // category gives, never a special "revoked" message to the public.
    const winners = await api(h).get(path('/winners')).expect(200);
    const year = winners.body.data.find((e: { year: number }) => e.year === 2031);
    expect(year.categories).toHaveLength(0);

    // The admin side still sees the true state of the row underneath.
    const stillWinner = await api(h).get(path(`/admin/creators/${creatorId}`)).set(h.auth).expect(200);
    expect(stillWinner.body.data.nominations[0].isWinner).toBe(true);
    expect(stillWinner.body.data.revokedAt).not.toBeNull();
  });

  it('refuses to revoke the same creator twice', async () => {
    await api(h)
      .post(path(`/admin/creators/${creatorId}/revoke`))
      .set(h.auth)
      .send({ reason: 'ລອງຊ້ຳ' })
      .expect(400);
  });

  it('restores public visibility once un-revoked', async () => {
    await api(h).post(path(`/admin/creators/${creatorId}/unrevoke`)).set(h.auth).expect(201);

    await api(h).get(path(`/creators/${creatorSlug}`)).expect(200);

    const category = await api(h).get(path(`/editions/${editionSlug}/categories/${categorySlug}`)).expect(200);
    expect(category.body.data.nominees).toHaveLength(1);

    const winners = await api(h).get(path('/winners')).expect(200);
    const year = winners.body.data.find((e: { year: number }) => e.year === 2031);
    expect(year.categories[0].winner.slug).toBe(creatorSlug);

    const admin = await api(h).get(path(`/admin/creators/${creatorId}`)).set(h.auth).expect(200);
    expect(admin.body.data.revokedAt).toBeNull();
  });
});
