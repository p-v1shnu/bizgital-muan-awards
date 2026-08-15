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

export async function getPublic<T>(path: string, options: Options = {}): Promise<T | null> {
  const url = new URL(`${BASE_URL}${path}`);
  if (options.preview) url.searchParams.set('preview', options.preview);

  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: options.revalidate ?? DEFAULT_REVALIDATE },
    });
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

/** Same, but a missing record renders the 404 page. */
export async function getPublicOrNotFound<T>(path: string, options: Options = {}): Promise<T> {
  const data = await getPublic<T>(path, options);
  if (data === null) notFound();
  return data;
}
