import Link from 'next/link';

import { ActionLink, Section } from '@/components/site/primitives';

/**
 * Sits inside the site group so a wrong URL keeps the header and footer —
 * the reader is one click from somewhere useful rather than at a dead end.
 */
export default function NotFound() {
  return (
    <Section className="py-24">
      <div className="foil mb-6 h-[3px] w-16 rounded-sm" aria-hidden />
      {/* English throughout, like every other failure page here — see the
          note in docs/lao-copy-review.md. Half a page in each language reads
          worse than either one. */}
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
