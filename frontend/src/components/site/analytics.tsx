'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * GA records the full address of every page, query string included, so a
 * preview link measured here would leave its token — seven days of access to
 * an unannounced year — readable by anyone with access to the property.
 * Preview pages are therefore not measured at all.
 */
export function Analytics({ gaId }: { gaId: string }) {
  const previewing = useSearchParams().has('preview');

  // Covers arriving at a preview by client-side navigation, after GA has
  // already loaded on an ordinary page: gtag checks this flag on every hit.
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] = previewing;
  }, [gaId, previewing]);

  return previewing ? null : <GoogleAnalytics gaId={gaId} />;
}
