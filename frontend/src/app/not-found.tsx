import type { Metadata } from 'next';

import { NOT_FOUND_TITLE, NotFoundBody } from '@/components/site/not-found-body';
import { SiteShell } from '@/components/site/shell';

export const metadata: Metadata = { title: NOT_FOUND_TITLE };

/**
 * For a URL that matches no route at all — /nope, or a mistyped /admin path.
 *
 * Next answers those above every layout, so without this file they got the
 * framework's own bare "404 This page could not be found" while /awards/1999
 * got the page we designed: two different answers to the same question. It
 * carries the chrome itself, because no layout runs above it.
 */
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundBody />
    </SiteShell>
  );
}
