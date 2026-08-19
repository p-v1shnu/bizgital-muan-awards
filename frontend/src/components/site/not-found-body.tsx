import Link from 'next/link';

import { ActionLink, Section } from '@/components/site/primitives';
import { Watermark } from '@/components/site/watermark';

/**
 * What a 404 says, without deciding what it sits inside.
 *
 * There are two ways to reach a 404 and they need different wrappers, which is
 * why this is a component rather than a page. A URL that matches no route at
 * all is answered by app/not-found.tsx, above every layout, so that one has to
 * bring the site chrome with it. A page that matched and then called
 * notFound() — /awards/1999, /creators/nobody — is answered by
 * (site)/not-found.tsx, which is already inside the site layout and must not
 * add a second one. Rendering the shell in both put two <main> elements and
 * two copies of the header and footer on the page; measured, before this file
 * existed.
 */
export function NotFoundBody() {
  return (
    <Section className="relative overflow-hidden py-24">
      {/* A 404 is the emptiest page on the site; the mark keeps it from reading
          as a broken page rather than a missing one. */}
      <Watermark className="-top-16 -right-20 hidden size-[340px] opacity-[0.04] md:block" />
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

/**
 * The tab title for every 404, and the only one that reaches a browser. The
 * pages each return their own "… not found" title, but a page that calls
 * notFound() never gets to use it: Next renders the boundary instead and takes
 * the title from there. Measured — without this the tab read
 * "ມ່ວນອາວອດສ໌ · Muan Awards", the layout default, on a URL that had just failed.
 */
export const NOT_FOUND_TITLE = 'Page not found';
