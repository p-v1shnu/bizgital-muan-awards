/**
 * Thin fetch wrapper around the NestJS API.
 *
 * Every response is `{ data, meta? }` and every error is
 * `{ statusCode, message, error, details? }` — that contract is enforced
 * server-side by ResponseInterceptor and HttpExceptionFilter, so this file
 * only has to unwrap it.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Seconds to cache on the server. Omit for no caching. */
  revalidate?: number;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, revalidate, headers, ...rest } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Refresh tokens live in an HttpOnly cookie.
    credentials: 'include',
    next: revalidate === undefined ? undefined : { revalidate },
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? response.statusText,
      payload?.details,
    );
  }
  return payload?.data as T;
}
