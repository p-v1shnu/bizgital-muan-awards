/**
 * Records store an object-storage key, never a full URL, so the CDN host can
 * change without a migration. The URL is assembled at render time.
 */
const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? '').replace(/\/$/, '');

export function imageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${BASE}/${key}`;
}

/** galleryImageKeys arrives as JSON, so it is narrowed rather than trusted. */
export function imageKeyList(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is string => typeof key === 'string');
}
