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
});
