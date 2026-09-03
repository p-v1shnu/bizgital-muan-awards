import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SiteImage } from './site-image';
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
        Heading === 'h1' && 'relative',
        className,
      )}
    >
      {/* Only the leading section, and only on the pages that lead with words
          rather than a picture — /about, /submit, /winners. A year, a category
          and a creator open with a photograph, which is decoration enough, and
          the homepage opens with the hero. Hidden below md: on a phone the mark
          would sit under the heading rather than beside it.

          `right-[calc(50%-50vw)]` puts the mark's right edge on the viewport's,
          not on this centred column's. The first attempt clipped it at the
          column edge, which is an invisible line with page margin beyond it —
          the mark read as a picture cropped by mistake. Whole mark, resting
          against the edge of the screen, is a placement; half a mark cut at
          nothing is not. */}
      {Heading === 'h1' && (
        <Watermark className="top-6 right-[calc(50%-50vw)] hidden h-[234px] w-[300px] opacity-[0.05] md:block" />
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
        className={cn(box, 'shrink-0 rounded-[20%] border border-rule object-cover')}
      />
    );
  }
  return (
    <span
      className={cn(
        box,
        'grid shrink-0 place-items-center rounded-[20%] border border-rule bg-panel-2 font-serif text-ink-3',
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
        'flex h-full flex-col overflow-hidden rounded-[var(--radius-box)] bg-panel',
        'shadow-[0_1px_2px_rgba(20,14,10,.05),0_1px_10px_rgba(20,14,10,.04)] transition-shadow',
        'hover:shadow-[0_2px_4px_rgba(20,14,10,.08),0_4px_18px_rgba(20,14,10,.07)]',
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-panel-2">
        <SiteImage
          imageKey={creator.avatarKey}
          alt={creator.nameLo}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
        />
        {isWinner && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-brand-deep px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_1px_4px_rgba(0,0,0,.25)]">
            ຜູ້ຊະນະ
          </span>
        )}
      </div>
      <div className="px-3.5 pb-4 pt-3.5 text-center">
        <p className="font-serif text-[17px] leading-tight text-ink">{creator.nameLo}</p>
        {creator.nameEn && <p className="mt-0.5 text-[11.5px] text-ink-3">{creator.nameEn}</p>}
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
      <Watermark className="-right-6 -bottom-8 h-[164px] w-[210px] opacity-[0.04]" />
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
