import Link from 'next/link';
import type { Metadata } from 'next';

import { ActionLink, Section } from '@/components/site/primitives';

/**
 * The tab title for every 404 on the site, and the only one that reaches a
 * browser. The pages each return their own "… not found" title, but a page
 * that calls notFound() never gets to use it: Next renders this boundary
 * instead and takes the title from here. Measured — without this export the
 * tab read "ມ່ວນ ອະວອດ · Muan Awards", the layout default, on a URL that had
 * just failed.
 */
export const metadata: Metadata = { title: 'Page not found' };

/**
 * Sits inside the site group so a wrong URL keeps the header and footer —
 * the reader is one click from somewhere useful rather than at a dead end.
 */
export default function NotFound() {
  return (
    <Section className="py-24">
      <div className="foil mb-6 h-[3px] w-16 rounded-sm" aria-hidden />
      {/* All English, message and buttons alike. These buttons exist only to
          offer a way out of a failure — they are not the site's interface,
          which stays Lao (docs/lao-copy-review.md). */}
      <h1 className="font-serif text-4xl leading-tight text-ink md:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
        This page may have moved, or it has not been published yet.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <ActionLink href="/">Home</ActionLink>
        <ActionLink href="/awards/latest" tone="quiet">
          Latest year
        </ActionLink>
        <ActionLink href="/winners" tone="quiet">
          Hall of winners
        </ActionLink>
      </div>

      <p className="mt-10 text-[13px] text-ink-3">
        If you followed an old link, start from the{' '}
        <Link href="/" className="text-brand-deep hover:underline">
          home page
        </Link>
      </p>
    </Section>
  );
}
