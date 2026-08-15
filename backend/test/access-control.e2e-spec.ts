import { api, createHarness, path, type Harness } from './harness';

describe('access control', () => {
  let h: Harness;
  let plainAdmin: { Authorization: string };

  beforeAll(async () => {
    h = await createHarness();
    await api(h)
      .post(path('/admin/users'))
      .set(h.auth)
      .send({
        email: 'editor@test.local',
        password: 'another-long-password',
        name: 'Editor',
        role: 'ADMIN',
      })
      .expect(201);

    const login = await api(h)
      .post(path('/auth/login'))
      .send({ email: 'editor@test.local', password: 'another-long-password' })
      .expect(200);
    plainAdmin = { Authorization: `Bearer ${login.body.data.accessToken}` };
  });

  afterAll(() => h.close());

  it('refuses admin routes without a token', async () => {
    await api(h).get(path('/admin/editions')).expect(401);
  });

  it('answers a wrong password the same way as an unknown account', async () => {
    const wrongPassword = await api(h)
      .post(path('/auth/login'))
      .send({ email: 'editor@test.local', password: 'not-the-password' })
      .expect(401);
    const unknownEmail = await api(h)
      .post(path('/auth/login'))
      .send({ email: 'nobody@test.local', password: 'not-the-password' })
      .expect(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('lets a plain admin manage content', async () => {
    await api(h).get(path('/admin/editions')).set(plainAdmin).expect(200);
    await api(h).get(path('/admin/creators')).set(plainAdmin).expect(200);
  });

  it('keeps user management and the audit trail for super admins', async () => {
    await api(h).get(path('/admin/users')).set(plainAdmin).expect(403);
    await api(h).get(path('/admin/audit')).set(plainAdmin).expect(403);

    await api(h).get(path('/admin/users')).set(h.auth).expect(200);
    await api(h).get(path('/admin/audit')).set(h.auth).expect(200);
  });

  it('refuses to let anyone delete their own account', async () => {
    const me = await api(h).get(path('/auth/me')).set(h.auth).expect(200);
    await api(h).delete(path(`/admin/users/${me.body.data.id}`)).set(h.auth).expect(403);
  });

  it('returns the name on /auth/me, which the admin shell shows after a reload', async () => {
    const me = await api(h).get(path('/auth/me')).set(h.auth).expect(200);
    expect(me.body.data).toMatchObject({ name: 'Test Admin', role: 'SUPER_ADMIN' });
  });

  it('refuses a second setup run', async () => {
    await api(h)
      .post(path('/auth/setup'))
      .send({ email: 'other@test.local', password: 'a-very-long-password', name: 'Other' })
      .expect(403);
  });

  it('rejects unknown properties instead of quietly ignoring them', async () => {
    const response = await api(h)
      .post(path('/auth/login'))
      .send({ email: 'a@b.com', password: '12345678', sneaky: 'x' })
      .expect(400);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.details).toContain('property sneaky should not exist');
  });

  it('puts the refresh token in an HttpOnly cookie scoped to the auth routes', async () => {
    const login = await api(h)
      .post(path('/auth/login'))
      .send({ email: 'editor@test.local', password: 'another-long-password' })
      .expect(200);

    const cookie = (login.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toContain('muan_refresh=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');
    // The refresh token must never be handed to JavaScript in the body.
    expect(JSON.stringify(login.body)).not.toContain('refreshToken');
  });

  /**
   * The password endpoint is the one place where guessing right gets
   * everything, and the global limit of a hundred requests a minute left room
   * for six thousand guesses an hour from a single address.
   */
  describe('a run of wrong passwords', () => {
    const guess = (from: string) =>
      api(h)
        .post(path('/auth/login'))
        .set('X-Forwarded-For', from)
        .send({ email: 'editor@test.local', password: 'wrong-guess' });

    it('locks the account out from that address, and answers 429', async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await guess('198.51.100.20').expect(401);
      }
      await guess('198.51.100.20').expect(429);

      // The right password is refused too while the lock-out holds.
      await api(h)
        .post(path('/auth/login'))
        .set('X-Forwarded-For', '198.51.100.20')
        .send({ email: 'editor@test.local', password: 'another-long-password' })
        .expect(429);
    });

    it('leaves the same account reachable from another address', async () => {
      await api(h)
        .post(path('/auth/login'))
        .set('X-Forwarded-For', '198.51.100.21')
        .send({ email: 'editor@test.local', password: 'another-long-password' })
        .expect(200);
    });
  });

  /**
   * Signing out used to clear the cookie and nothing else: the refresh token
   * inside it stayed valid for a week, so a stolen one outlived the logout.
   * It now ends that session — and only that session, because a team member
   * signing out of a phone should not be signed out of the desk they are at.
   */
  describe('signing out', () => {
    const signIn = (from: string) =>
      api(h)
        .post(path('/auth/login'))
        .set('X-Forwarded-For', from)
        .send({ email: 'editor@test.local', password: 'another-long-password' })
        .expect(200);

    it('kills the refresh token and the access token that were issued with it', async () => {
      const login = await signIn('198.51.100.30');
      const token = { Authorization: `Bearer ${login.body.data.accessToken}` };
      const cookie = login.headers['set-cookie'];
      await api(h).get(path('/auth/me')).set(token).expect(200);

      await api(h).post(path('/auth/logout')).set(token).expect(204);

      await api(h).get(path('/auth/me')).set(token).expect(401);
      await api(h).post(path('/auth/refresh')).set('Cookie', cookie).expect(401);
    });

    it('leaves the other browser signed in', async () => {
      const phone = await signIn('198.51.100.32');
      const laptop = await signIn('198.51.100.33');
      const phoneToken = { Authorization: `Bearer ${phone.body.data.accessToken}` };
      const laptopToken = { Authorization: `Bearer ${laptop.body.data.accessToken}` };

      await api(h).post(path('/auth/logout')).set(phoneToken).expect(204);

      await api(h).get(path('/auth/me')).set(phoneToken).expect(401);
      await api(h).get(path('/auth/me')).set(laptopToken).expect(200);
      await api(h)
        .post(path('/auth/refresh'))
        .set('Cookie', laptop.headers['set-cookie'])
        .expect(200);
    });

    it('survives a refresh: the new tokens belong to the same session', async () => {
      const login = await signIn('198.51.100.34');
      const refreshed = await api(h)
        .post(path('/auth/refresh'))
        .set('Cookie', login.headers['set-cookie'])
        .expect(200);

      const token = { Authorization: `Bearer ${refreshed.body.data.accessToken}` };
      await api(h).post(path('/auth/logout')).set(token).expect(204);

      // The cookie handed back by the refresh is dead too, not just the token.
      await api(h)
        .post(path('/auth/refresh'))
        .set('Cookie', refreshed.headers['set-cookie'])
        .expect(401);
    });
  });

  it('ends every session when the password changes — unlike a logout', async () => {
    const login = await api(h)
      .post(path('/auth/login'))
      .set('X-Forwarded-For', '198.51.100.31')
      .send({ email: 'editor@test.local', password: 'another-long-password' })
      .expect(200);
    const token = { Authorization: `Bearer ${login.body.data.accessToken}` };

    const second = await api(h)
      .post(path('/auth/login'))
      .set('X-Forwarded-For', '198.51.100.35')
      .send({ email: 'editor@test.local', password: 'another-long-password' })
      .expect(200);
    const other = { Authorization: `Bearer ${second.body.data.accessToken}` };

    await api(h)
      .post(path('/admin/users/me/password'))
      .set(token)
      .send({ currentPassword: 'another-long-password', newPassword: 'a-third-long-password' })
      .expect(204);

    // Every browser at once, including the one that made the change: a
    // password is usually changed because it may be in someone else's hands.
    await api(h).get(path('/auth/me')).set(token).expect(401);
    await api(h).get(path('/auth/me')).set(other).expect(401);
  });

  it('answers an oversized body with 413 rather than 500', async () => {
    await api(h)
      .post(path('/submissions'))
      .send({ categoryId: 'x', creatorNameRaw: 'A'.repeat(500_000) })
      .expect(413);
  });

  /**
   * A back-office account in the wrong hands should not be able to leave a
   * link that runs code on a public page (OWASP A05:2025). The keys were
   * filtered before; the values were not.
   */
  it('refuses to store a social link that is not a web address', async () => {
    const created = await api(h)
      .post(path('/admin/creators'))
      .set(h.auth)
      .send({
        slug: 'link-probe',
        nameLo: 'ທົດສອບລິງກ໌',
        socialLinks: {
          facebook: 'javascript:alert(1)',
          tiktok: 'https://tiktok.com/@ok',
          youtube: 'not-a-url-at-all',
        },
      })
      .expect(201);

    expect(created.body.data.socialLinks).toEqual({ tiktok: 'https://tiktok.com/@ok' });
  });

  it('writes a failed sign-in to the audit trail, not only the successes', async () => {
    await api(h)
      .post(path('/auth/login'))
      .set('X-Forwarded-For', '198.51.100.40')
      .send({ email: 'editor@test.local', password: 'wrong-again' })
      .expect(401);

    const trail = await api(h)
      .get(path('/admin/audit?action=admin.login.failed'))
      .set(h.auth)
      .expect(200);
    expect(trail.body.data.length).toBeGreaterThan(0);
  });
});
