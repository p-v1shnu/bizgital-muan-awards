import { clientNetwork } from '../src/common/utils/client-network';
import { api, categoryTemplate, createHarness, path, type Harness } from './harness';

const SECRET = 'test-internal-api-secret-that-is-long-enough-0123';

describe('clientNetwork', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64'],
    ['2001:db8:1:2::9', '2001:db8:1:2::/64'],
    ['2001:0db8:0001:0002:ffff::1', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['fe80::1%eth0', 'fe80:0:0:0::/64'],
  ])('%s → %s', (ip, expected) => {
    expect(clientNetwork(ip)).toBe(expected);
  });
});

describe('the rate limit', () => {
  let h: Harness;

  beforeAll(async () => {
    process.env.INTERNAL_API_SECRET = SECRET;
    h = await createHarness();
  });

  afterAll(async () => {
    delete process.env.INTERNAL_API_SECRET;
    await h.close();
  });

  /** Sends until refused or out of attempts; returns how many were answered first. */
  async function untilLimited(send: (attempt: number) => Promise<{ status: number }>, max = 130) {
    for (let attempt = 0; attempt < max; attempt += 1) {
      const { status } = await send(attempt);
      if (status === 429) return attempt;
    }
    return max;
  }

  /**
   * Every page is rendered by the site's own server, from one address. Counted
   * as one client, anyone could fill its bucket and every page would fail.
   */
  it("never limits the site's own cached reads", async () => {
    const answered = await untilLimited(() =>
      api(h).get(path('/editions')).set('X-Forwarded-For', '10.0.0.5').set('x-internal-secret', SECRET),
    );
    expect(answered).toBe(130);
  });

  it('limits a caller that only claims to be the site', async () => {
    const answered = await untilLimited(() =>
      api(h)
        .get(path('/editions'))
        .set('X-Forwarded-For', '198.51.100.90')
        .set('x-internal-secret', 'not-the-secret'),
    );
    expect(answered).toBeLessThan(130);
  });

  it('counts a read the site makes for a visitor against that visitor alone', async () => {
    const asSite = (visitor: string) =>
      api(h)
        .get(path('/editions/latest'))
        .set('X-Forwarded-For', '10.0.0.5')
        .set('x-internal-secret', SECRET)
        .set('x-visitor-ip', visitor);

    expect(await untilLimited(() => asSite('198.51.100.91'))).toBeLessThan(130);
    // Someone else, rendered by the same server a moment later, is unaffected.
    expect((await asSite('198.51.100.92')).status).not.toBe(429);
  });

  it('counts one IPv6 /64 as one client, however many addresses it uses', async () => {
    const answered = await untilLimited((attempt) =>
      api(h).get(path('/stats')).set('X-Forwarded-For', `2001:db8:77:1::${(attempt + 1).toString(16)}`),
    );
    expect(answered).toBeLessThan(130);
  });

  /**
   * Eight wrong passwords per account and address left no ceiling for anyone
   * with many addresses. An unknown email is used so no real account is locked.
   */
  it('locks an account out across addresses once enough guesses pile up', async () => {
    const guess = (from: string) =>
      api(h)
        .post(path('/auth/login'))
        .set('X-Forwarded-For', from)
        .send({ email: 'ghost@test.local', password: 'wrong-guess' });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await guess(`198.51.101.${attempt + 1}`).expect(401);
    }
    await guess('198.51.101.200').expect(429);

    // A different account is untouched.
    await api(h)
      .post(path('/auth/login'))
      .set('X-Forwarded-For', '198.51.101.201')
      .send({ email: 'someone-else@test.local', password: 'wrong-guess' })
      .expect(401);
  });
});

describe('the daily de-duplication of entries', () => {
  let h: Harness;
  let categoryId: string;

  beforeAll(async () => {
    h = await createHarness();
    const editionId = (
      await api(h)
        .post(path('/admin/editions'))
        .set(h.auth)
        .send({ year: 2031, slug: '2031', titleLo: 'ງານ 2031' })
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
  });

  afterAll(() => h.close());

  it('counts one name from one IPv6 /64 once, whichever address sent it', async () => {
    for (const from of ['2001:db8:55:1::1', '2001:db8:55:1::2', '2001:db8:55:1:abcd::9']) {
      await api(h)
        .post(path('/submissions'))
        .set('X-Forwarded-For', from)
        .send({ categoryId, creatorNameRaw: 'ໄອພີຫົກ', reasonTags: ['creativity'] })
        .expect(201);
    }
    const stored = await h.prisma.publicSubmission.count({ where: { creatorNameRaw: 'ໄອພີຫົກ' } });
    expect(stored).toBe(1);
  });
});
