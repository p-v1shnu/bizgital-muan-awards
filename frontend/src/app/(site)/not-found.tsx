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
      {/* The message is English, because a failure is the one screen nobody
          reviews (docs/lao-copy-review.md). The buttons are interface and stay
          Lao, like every other button on the site. */}
      <h1 className="font-serif text-4xl leading-tight text-ink md:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
        This page may have moved, or it has not been published yet.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <ActionLink href="/">ກັບໜ້າແຮກ</ActionLink>
        <ActionLink href="/awards/latest" tone="quiet">
          ງານປີລ່າສຸດ
        </ActionLink>
        <ActionLink href="/winners" tone="quiet">
          ທຳນຽບຜູ້ຊະນະ
        </ActionLink>
      </div>

      <p className="mt-10 text-[13px] text-ink-3">
        If you followed an old link, start from{' '}
        <Link href="/" className="text-brand-deep hover:underline">
          ໜ້າແຮກ
        </Link>
      </p>
    </Section>
  );
}
