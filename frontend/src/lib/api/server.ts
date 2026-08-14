import { notFound } from 'next/navigation';

/**
 * Reads for Server Components. Separate from the browser client because none
 * of that applies here: there is no token to attach, no refresh to retry, and
 * a missing record should render the not-found page rather than throw.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Public pages are rebuilt on a timer; the admin triggers nothing on save. */
const DEFAULT_REVALIDATE = 60;

interface Options {
  revalidate?: number;
  /** Pass a preview token straight through to the API. */
  preview?: string;
}

export async function getPublic<T>(path: string, options: Options = {}): Promise<T | null> {
  const url = new URL(`${BASE_URL}${path}`);
  if (options.preview) url.searchParams.set('preview', options.preview);

  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: options.revalidate ?? DEFAULT_REVALIDATE },
    });
  } catch {
    // The API being briefly unreachable should degrade the page, not break it.
    return null;
  }

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null);
  return (payload?.data ?? null) as T | null;
}

/** Same, but a missing record renders the 404 page. */
export async function getPublicOrNotFound<T>(path: string, options: Options = {}): Promise<T> {
  const data = await getPublic<T>(path, options);
  if (data === null) notFound();
  return data;
}
