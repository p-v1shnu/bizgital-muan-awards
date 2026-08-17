/** Anything outside this list is dropped rather than stored (PRD §8). */
export const ALLOWED_SOCIALS = ['facebook', 'tiktok', 'youtube', 'instagram'] as const;

/**
 * Keeps the four known networks, and only if the value is a web address.
 *
 * The keys were filtered before but the values were not, so `javascript:` went
 * in untouched and came back out as the href of the icon on the public profile
 * — a link that runs code in the site's own origin for whoever clicks it
 * (OWASP A05:2025). One compromised back-office account should not be able to
 * leave that behind on a page everyone visits.
 */
export function cleanSocialLinks(links?: Record<string, string>) {
  if (!links) return undefined;
  const out: Record<string, string> = {};
  for (const key of ALLOWED_SOCIALS) {
    const value = links[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const trimmed = value.trim();
    try {
      const { protocol } = new URL(trimmed);
      if (protocol === 'http:' || protocol === 'https:') out[key] = trimmed;
    } catch {
      // Not a URL at all — drop it rather than store something unusable.
    }
  }
  return out;
}
