import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

/**
 * Reads for Server Components. Separate from the browser client because none
 * of that applies here: there is no token to attach, no refresh to retry, and
 * a missing record should render the not-found page rather than throw.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * How long a public page may be stale. The API also clears these pages the
 * moment the back office saves anything (RevalidationService), so this is the
 * backstop rather than the mechanism.
 */
const DEFAULT_REVALIDATE = 60;

interface Options {
  revalidate?: number;
  /** Pass a preview token straight through to the API. */
  preview?: string;
  /**
   * Send the visitor's own cookies with the read, so the API can tell whether
   * this is a signed-in admin (PRD §4.3.2). Only for pages that can show a
   * draft — it makes the response personal, so the page must not be cached.
   */
  asViewer?: boolean;
}

/**
 * Thrown when the API could not answer at all. It is deliberately not the same
 * thing as "the API said this does not exist": treating an outage as an empty
 * database published the awards as though no year had ever happened — the
 * homepage fell back to its pre-launch placeholders, the hall of winners said
 * there were none, and a real year answered 404, which is the one status that
 * tells a search engine to drop the page for good. An outage has to read as
 * temporary, so it surfaces as a 500 and Next renders the error page.
 */
class ApiUnavailableError extends Error {}

/**
 * The build is the one time an unreachable API must not throw: `npm run build`
 * runs in CI and on a fresh server with nothing else up yet, and a build that
 * needs a live database to succeed is a build that fails at the worst moment.
 * The pages baked here carry a 60-second revalidate and none of them can 404,
 * so an empty one repairs itself on the first request after the API is up.
 */
const BUILDING = process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Refuses a path that would climb out of the segment it was written into.
 *
 * Every caller interpolates a route segment — a year, a slug — into a literal
 * path, and a URL resolves `..` before anything looks at it. So the page at
 * `/awards/..%2Fadmin%2Fusers` received the plain string `../admin/users`,
 * built `/api/v1/editions/../admin/users`, and this process read
 * `/api/v1/admin/users`: a request made from inside the network, against a
 * host no visitor can reach. `?` and `#` in a segment redirected the query
 * string the same way. Nothing came back — those routes want a bearer token a
 * server render does not have — but which internal path this process fetches
 * is not a decision to leave to a URL segment.
 *
 * `..` is the only thing that climbs, so that is what this looks for, in the
 * path as written rather than in the URL after it has been resolved: by then
 * `/api/v1/editions/../admin/users` has become `/api/v1/admin/users`, which
 * sits under the prefix perfectly happily and tells you nothing.
 *
 * `apiPath` below is the fix at the call sites; this is the backstop, and it
 * also catches what encoding alone does not — `encodeURIComponent` leaves a
 * dot alone, so a segment of exactly `..` survives it intact.
 *
 * Answered as "no such record" rather than thrown, because that is what it is:
 * `/awards/%2E%2E` is a URL somebody typed, and the visitor should get the
 * not-found page. Throwing would make it a 500 instead — a lie about whose
 * fault it is, and countable: ten of them inside five minutes is the spike
 * that `/health/errors` reports and that wakes somebody up (monitoring.md §6),
 * which would put that alarm within reach of anyone with a browser. The
 * refusal is logged so a caller that does this by mistake is still findable.
 */
function climbsOutOfPath(path: string) {
  if (!path.split('/').some((segment) => segment === '..' || segment === '.')) return false;
  console.warn(`Refused an API path that climbs out of its segment: ${path}`);
  return true;
}

/**
 * Builds a request path with every interpolated value encoded, so a route
 * segment cannot mean anything but a segment.
 *
 * A tagged template rather than a rule to remember: the encoding is the thing
 * that was missing at all six call sites, and `apiPath\`/creators/${slug}\``
 * cannot be written without it the way a plain template string could.
 */
export function apiPath(strings: TemplateStringsArray, ...values: (string | number)[]) {
  return strings.reduce(
    (out, part, index) =>
      out + part + (index < values.length ? encodeURIComponent(values[index]) : ''),
    '',
  );
}

export async function getPublic<T>(path: string, options: Options = {}): Promise<T | null> {
  if (climbsOutOfPath(path)) return null;
  const url = new URL(`${BASE_URL}${path}`);
  if (options.preview) url.searchParams.set('preview', options.preview);

  // A read that carries someone's cookie is about them, and caching it would
  // serve one person's draft to the next visitor.
  const headers = options.asViewer ? { cookie: (await cookies()).toString() } : undefined;
  const caching = options.asViewer
    ? ({ cache: 'no-store' } as const)
    : ({ next: { revalidate: options.revalidate ?? DEFAULT_REVALIDATE } } as const);

  let response: Response;
  try {
    response = await fetch(url, { ...caching, headers });
  } catch (caught) {
    if (BUILDING) return null;
    throw new ApiUnavailableError(`${path} could not be reached: ${String(caught)}`);
  }

  // The only answer that means "there is no such thing".
  if (response.status === 404) return null;
  if (!response.ok) {
    if (BUILDING) return null;
    throw new ApiUnavailableError(`${path} answered ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  return (payload?.data ?? null) as T | null;
}

/**
 * Returns null on an outage instead of throwing. For the header, the footer and
 * `generateMetadata` — the parts that decorate a page rather than being it.
 * None of them is worth failing a request over: a page that could otherwise
 * have rendered should not go down because a year was missing from the nav.
 *
 * Page bodies must keep using `getPublic` and keep throwing: a missing nav link
 * or a generic <title> during an outage is a small loss, and content quietly
 * reading as empty is the large one this file exists to prevent. What the
 * visitor sees when a page body does throw is Caddy's business, not Next's —
 * see `error-pages/outage.html`, because neither `error.tsx` nor
 * `global-error.tsx` renders for a Server Component that throws on first paint.
 */
export async function tryGetPublic<T>(path: string, options: Options = {}): Promise<T | null> {
  try {
    return await getPublic<T>(path, options);
  } catch (caught) {
    if (caught instanceof ApiUnavailableError) return null;
    throw caught;
  }
}

/**
 * A public read first, and only if that finds nothing, a personal one.
 *
 * The order matters for more than tidiness. Asking as the visitor means
 * sending their cookie, which makes the answer theirs and the page
 * uncacheable — doing that on every request would trade the whole site's
 * caching for a case that applies to a handful of people preparing next year.
 * A published year is found on the first read and never reaches the second.
 *
 * The second read only happens for a page the public genuinely cannot see,
 * which is exactly when PRD §4.3.2's promise applies: the team opens
 * /awards/2027 while it is still a draft and sees it.
 */
export async function getPublicOrDraft<T>(path: string, options: Options = {}): Promise<T | null> {
  // A URL carrying `preview` is asking to be read as whoever opened it, which
  // is the only way an admin can see a *published* year's unannounced nominees:
  // the cached read succeeds for such a year, so without this the cookie would
  // never be sent and the page would come back exactly as the public sees it.
  // Reading as the viewer also keeps the answer out of the shared cache, which
  // is what must happen to a page that depends on who asked.
  if (options.preview) return getPublic<T>(path, { ...options, asViewer: true });

  const published = await getPublic<T>(path, options);
  if (published) return published;
  return getPublic<T>(path, { ...options, asViewer: true });
}

/** Same, but a missing record renders the 404 page. */
export async function getPublicOrNotFound<T>(path: string, options: Options = {}): Promise<T> {
  const data = await getPublic<T>(path, options);
  if (data === null) notFound();
  return data;
}
