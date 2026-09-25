import Image from 'next/image';

import { cn } from '@/lib/utils';
import { imageUrl } from '@/lib/images';

/**
 * Every picture on the public site goes through next/image (PRD §10): most
 * visitors arrive from Facebook on a phone, and sending a 2400px hero down a
 * 4G connection is the single easiest way to miss the 2.5s LCP target.
 *
 * When the key is missing — the team has not uploaded that picture yet — a
 * warm panel stands in rather than a broken frame.
 */
/**
 * What to pass as `fallbackClassName` on a hero that prints white text over the
 * picture. The default stand-in is a warm cream panel, which is right for a card
 * on paper and wrong under a white heading — the year title and the homepage's
 * own hero were both close to invisible on it while the team had yet to upload
 * an image. Kept here rather than written out at each hero, so the two cannot
 * drift into two different darks.
 */
export const INK_FALLBACK = 'bg-[linear-gradient(160deg,#2c2028,#1b1116)]';

export function SiteImage({
  imageKey,
  alt = '',
  className,
  /** Tells the browser how wide this will actually be, so it picks a size. */
  sizes = '100vw',
  priority,
  /** Forces an eager fetch outside of `priority` — for an image that is not
   *  on screen yet (the lightbox's next/previous slide) but should already
   *  be in the browser's cache by the time it is, which `loading="lazy"`
   *  (the default) would otherwise delay until it scrolls into view. */
  loading,
  fallbackClassName,
  /** Vertical crop centre, 0 (top) to 100 (bottom) — for a box whose aspect
   *  ratio varies a lot across screen widths (the homepage hero: wide on
   *  desktop, tall on a phone), where a plain centre crop can cut off the
   *  photo's important part at one width and not the other. Undefined keeps
   *  the default centre. */
  focalY,
  /** A person's own first letter, centred in the fallback panel instead of
   *  leaving it blank — so a creator or judge with no photo yet still reads
   *  as themselves rather than as an empty tile identical to everyone
   *  else's. Ignored once imageKey resolves to a real image. Size it with
   *  `fallbackClassName` (e.g. `text-5xl`) to match the box. */
  fallbackInitial,
}: {
  imageKey: string | null | undefined;
  alt?: string;
  className?: string;
  sizes?: string;
  /** Set on the one image above the fold; it is what LCP measures. */
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  fallbackClassName?: string;
  focalY?: number | null;
  fallbackInitial?: string;
}) {
  const src = imageUrl(imageKey);

  if (!src) {
    return (
      <div
        aria-hidden
        className={cn(
          'grid size-full place-items-center bg-[linear-gradient(140deg,#f4efe5,#e4d8c4)] font-serif font-bold text-ink-3',
          className,
          fallbackClassName,
        )}
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      className={cn('object-cover', className)}
      style={focalY == null ? undefined : { objectPosition: `50% ${focalY}%` }}
    />
  );
}

/** For fixed-size pictures — avatars, sponsor logos — where `fill` is wrong. */
export function SiteImageFixed({
  imageKey,
  alt = '',
  width,
  height,
  className,
}: {
  imageKey: string | null | undefined;
  alt?: string;
  width: number;
  height: number;
  className?: string;
}) {
  const src = imageUrl(imageKey);
  if (!src) return null;

  return <Image src={src} alt={alt} width={width} height={height} className={className} />;
}
