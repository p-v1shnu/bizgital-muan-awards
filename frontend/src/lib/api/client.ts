/**
 * Thin fetch wrapper around the NestJS API.
 *
 * Every response is `{ data, meta? }` and every error is
 * `{ statusCode, message, error, details? }` — that contract is enforced
 * server-side by ResponseInterceptor and HttpExceptionFilter, so this file
 * only has to unwrap it.
 *
 * The access token lives in memory only. The refresh token is an HttpOnly
 * cookie the browser sends on its own, so nothing sensitive is ever written
 * to localStorage where a script could read it back.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Seconds to cache on the server. Omit for no caching. */
  revalidate?: number;
  /** Set for the auth calls themselves, so a 401 does not loop. */
  skipRefresh?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawFetch(path, options);

  // An expired access token is the normal case, not an error: swap it for a
  // fresh one using the refresh cookie and replay the request once.
  if (response.status === 401 && !options.skipRefresh) {
    const token = await refreshAccessToken();
    if (token) {
      const retried = await rawFetch(path, options);
      return unwrap<T>(retried);
    }
  }
  return unwrap<T>(response);
}

/** Same as apiFetch but keeps the `meta` envelope for paginated lists. */
export async function apiFetchPage<T>(path: string, options: RequestOptions = {}) {
  const response = await rawFetch(path, options);
  const settled =
    response.status === 401 && !options.skipRefresh && (await refreshAccessToken())
      ? await rawFetch(path, options)
      : response;

  const payload = await readBody(settled);
  if (!settled.ok) {
    throw new ApiError(settled.status, payload?.message ?? settled.statusText, payload?.details);
  }
  return { data: (payload?.data ?? []) as T[], meta: payload?.meta as PageMeta | undefined };
}

function rawFetch(path: string, { body, revalidate, headers, ...rest }: RequestOptions) {
  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // The refresh token rides in an HttpOnly cookie.
    credentials: 'include',
    next: revalidate === undefined ? undefined : { revalidate },
  });
}

async function readBody(response: Response) {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await readBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? response.statusText, payload?.details);
  }
  return payload?.data as T;
}

/**
 * Several requests can fail at once when a token expires; they all wait on the
 * same refresh rather than firing one each and racing to replace the token.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await rawFetch('/auth/refresh', { method: 'POST' });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const payload = await response.json();
      accessToken = payload?.data?.accessToken ?? null;
      return accessToken;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
