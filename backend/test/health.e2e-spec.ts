import { api, createHarness, path, type Harness } from './harness';
import { recordServerError, resetServerErrors } from '../src/common/server-errors';

/**
 * The probes an outside watcher reads (monitoring.md §2, §6, §10). Three of them,
 * on purpose: what has to wake someone, what can wait until morning, and the one
 * failure an uptime check cannot see at all — every page answering while every
 * save returns 500.
 */
describe('health probes', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  beforeEach(() => resetServerErrors());

  it('answers only after the database has answered', async () => {
    const response = await api(h).get(path('/health')).expect(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('reports a quiet window as ok, with the numbers it judged on', async () => {
    const response = await api(h).get(path('/health/errors')).expect(200);
    expect(response.body.data).toMatchObject({
      status: 'ok',
      serverErrors: 0,
      windowMinutes: 5,
    });
    expect(response.body.data.threshold).toBeGreaterThan(0);
  });

  /**
   * The whole point of the counter: a real 500 out of a real route, seen through
   * the endpoint an outside watcher polls. The failure is provoked rather than
   * imagined, because what is being tested is the wiring — the filter counts
   * every 5xx, including ones no code meant to send.
   */
  it('counts a 500 that nothing meant to send', async () => {
    const spy = jest
      .spyOn(h.prisma.edition, 'findMany')
      .mockRejectedValueOnce(new Error('the database fell over'));

    await api(h).get(path('/editions')).expect(500);
    spy.mockRestore();

    const response = await api(h).get(path('/health/errors')).expect(200);
    expect(response.body.data.serverErrors).toBe(1);
  });

  /**
   * A probe that reports a problem must not become the problem. /health/errors
   * answers 503 past the threshold, so counting its own answers would hold the
   * alarm open by itself; /health/storage answers 503 when images are gone, which
   * is deliberately the alarm that waits until morning (§10) and must not trip
   * the one that wakes people.
   */
  it('leaves its own 503 out of the count', async () => {
    const threshold = Number(process.env.ERROR_SPIKE_THRESHOLD ?? 10);
    for (let i = 0; i < threshold; i += 1) recordServerError();

    const first = await api(h).get(path('/health/errors')).expect(503);
    expect(first.body.message).toContain(`${threshold} server errors`);

    // Polled again: still exactly at the threshold rather than one higher.
    const second = await api(h).get(path('/health/errors')).expect(503);
    expect(second.body.message).toContain(`${threshold} server errors`);
  });
});
