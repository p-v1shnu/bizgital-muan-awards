import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Watermark } from './watermark';
import { imageUrl } from '@/lib/images';
import type { Creator } from '@/types/api';

export function Section({
  eyebrow,
  title,
  intro,
  children,
  className,
  id,
  /**
   * The leading section of a page passes 'h1'. Every page needs exactly one,
   * for screen readers and for what search engines read as the page's subject.
   */
  titleAs: Heading = 'h2',
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  titleAs?: 'h1' | 'h2';
}) {
  return (
    <section
      id={id}
      className={cn(
        'mx-auto max-w-6xl px-5 py-14 md:py-20',
        // The mark hangs off the right edge, so the section has to be the frame
        // it is clipped against.
        Heading === 'h1' && 'relative overflow-hidden',
        className,
      )}
    >
      {/* Only the leading section, and only on the pages that lead with words
          rather than a picture — /about, /submit, /winners. A year, a category
          and a creator open with a photograph, which is decoration enough, and
          the homepage opens with the hero. Hidden below md: on a phone the mark
          would sit under the heading rather than beside it. */}
      {Heading === 'h1' && (
        <Watermark className="-top-10 -right-14 hidden size-[260px] opacity-[0.035] md:block" />
      )}
      {(eyebrow || title) && (
        <header className="mb-8 max-w-2xl">
          {eyebrow && (
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-3">{eyebrow}</p>
          )}
          {title && (
            <Heading className="mt-2 font-serif text-3xl leading-tight text-ink md:text-4xl">
              {title}
            </Heading>
          )}
          {intro && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{intro}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Primary in-site action. External links use ActionLink with `external`. */
export function ActionLink({
  href,
  children,
  tone = 'primary',
  external,
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: 'primary' | 'quiet';
  external?: boolean;
  className?: string;
}) {
  const classes = cn(
    'inline-flex items-center gap-2 rounded-[var(--radius-btn)] px-5 py-3 text-[14px] font-semibold',
    tone === 'primary'
      ? 'bg-ink text-white hover:bg-brand-deep'
      : 'border border-rule bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink',
    className,
  );

  // A link that leaves the site says so, so "buy tickets" never looks like it
  // is handled here (PRD §7.4).
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
        <ExternalLink className="size-4" />
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

/**
 * `alt` defaults to empty, and that default is right far more often than it
 * looks. Most of these sit inside a link that already carries the person's
 * name as text — the winners table, the nominee cards — and describing the
 * picture there makes a screen reader read the same name twice.
 *
 * Pass a name where the picture is the subject rather than an ornament: the
 * portrait at the top of a profile, a judge's card. Those are also the ones
 * worth finding in an image search, and until this prop existed not one photo
 * of a person on the site was described at all.
 */
export function Avatar({
  creator,
  size = 'md',
  alt = '',
}: {
  creator: Pick<Creator, 'nameLo' | 'avatarKey'>;
  size?: 'md' | 'lg';
  alt?: string;
}) {
  const src = imageUrl(creator.avatarKey);
  const box = size === 'lg' ? 'size-28' : 'size-16';

  if (src) {
    const px = size === 'lg' ? 112 : 64;
    return (
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        className={cn(box, 'shrink-0 rounded-full border border-rule object-cover')}
      />
    );
  }
  return (
    <span
      className={cn(
        box,
        'grid shrink-0 place-items-center rounded-full border border-rule bg-panel-2 font-serif text-ink-3',
        size === 'lg' ? 'text-3xl' : 'text-xl',
      )}
    >
      {creator.nameLo.trim().charAt(0)}
    </span>
  );
}

export function CreatorCard({
  creator,
  isWinner,
  href,
}: {
  creator: Pick<Creator, 'slug' | 'nameLo' | 'nameEn' | 'avatarKey'>;
  isWinner?: boolean;
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        'flex h-full flex-col items-center gap-3 rounded-[var(--radius-box)] border p-5 text-center transition-colors',
        isWinner
          ? 'border-brand-edge bg-brand-soft'
          : 'border-rule bg-panel hover:border-ink-3',
      )}
    >
      <Avatar creator={creator} />
      <div>
        {isWinner && (
          <span className="mb-1.5 inline-block rounded-full border border-brand-edge bg-white px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide text-brand-deep">
            ຜູ້ຊະນະ
          </span>
        )}
        <p className="font-serif text-[19px] leading-tight text-ink">{creator.nameLo}</p>
        {creator.nameEn && <p className="mt-0.5 text-[12px] text-ink-3">{creator.nameEn}</p>}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * "There is nothing here yet" — said in a box rather than a bare line, with the
 * mark behind it. Most of this site's early life is spent in these states (no
 * year announced, no nominees published, a creator with no appearances yet), so
 * they are what a first visitor actually sees; an empty panel with the brand
 * behind it reads as "not yet" instead of as "broken".
 */
export function EmptyNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-12 text-center text-[14px] text-ink-2',
        className,
      )}
    >
      <Watermark className="-right-8 -bottom-10 size-[210px] opacity-[0.04]" />
      <p className="relative">{children}</p>
    </div>
  );
}

/**
 * Marks copy the team has not supplied yet. Visible on purpose: placeholder
 * text that blends in is the kind that ships.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-dashed border-brand-edge bg-brand-soft/60 px-1.5 py-0.5 text-ink-2">
      {children}
    </span>
  );
}
