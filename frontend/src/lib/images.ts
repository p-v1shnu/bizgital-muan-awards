/**
 * Records store an object-storage key, never a full URL, so the CDN host can
 * change without a migration. The URL is assembled at render time.
 */
const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? '').replace(/\/$/, '');

export function imageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${BASE}/${key}`;
}

/** Keys the team has not filled in yet, so a page still has something to show. */
export function imageUrlList(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is string => typeof key === 'string').map((key) => `${BASE}/${key}`);
}
