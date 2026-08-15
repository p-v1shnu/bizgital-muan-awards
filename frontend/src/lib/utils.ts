import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the address only if it is one a browser may follow safely.
 *
 * Rows written before the API validated them — or by a back-office account in
 * someone else's hands — can still hold a `javascript:` link, and React puts
 * whatever it is given into an href. Anything that is not http(s) becomes no
 * link at all (OWASP A05:2025).
 */
export function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
