import { api, createHarness, path, type Harness } from './harness';

/**
 * Every audit entry clears the site's whole cache unless it is known to change
 * nothing a visitor sees. A failed sign-in used to be missing from that list,
 * so anyone who knew an admin address could empty the cache on demand — and
 * every visitor after it was served straight from the database.
 */
describe('site cache revalidation', () => {
  let h: Harness;
  let fetchSpy: jest.SpyInstance;
  const saved = { url: process.env.REVALIDATE_URL, secret: process.env.REVALIDATE_SECRET };

  beforeAll(async () => {
    process.env.REVALIDATE_URL = 'http://revalidate.test/api/revalidate';
    process.env.REVALIDATE_SECRET = 'test-revalidate-secret';
    h = await createHarness();
  });

  afterAll(async () => {
    process.env.REVALIDATE_URL = saved.url;
    process.env.REVALIDATE_SECRET = saved.secret;
    await h.close();
  });

  // Supertest talks to the server over a socket, not through fetch, so the
  // only fetch calls seen here are the ones the API makes itself.
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
  });
  afterEach(() => fetchSpy.mockRestore());

  const revalidations = () =>
    fetchSpy.mock.calls.filter(([url]) => String(url) === process.env.REVALIDATE_URL).length;

  it('does not clear the cache for a failed sign-in', async () => {
    await api(h)
      .post(path('/auth/login'))
      .send({ email: h.admin.email, password: 'not-the-password' })
      .expect(401);

    expect(revalidations()).toBe(0);
  });

  it('does not clear the cache for account changes', async () => {
    await api(h)
      .post(path('/admin/users'))
      .set(h.auth)
      .send({ email: 'second@test.local', password: 'another-long-password', name: 'Second Admin' })
      .expect(201);

    expect(revalidations()).toBe(0);
  });

  it('still clears the cache when content changes', async () => {
    await api(h)
      .post(path('/admin/editions'))
      .set(h.auth)
      .send({ year: 2032, slug: '2032', titleLo: 'ງານ 2032' })
      .expect(201);

    expect(revalidations()).toBe(1);
  });
});
