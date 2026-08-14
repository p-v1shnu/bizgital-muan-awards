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
export function SiteImage({
  imageKey,
  alt = '',
  className,
  /** Tells the browser how wide this will actually be, so it picks a size. */
  sizes = '100vw',
  priority,
  fallbackClassName,
}: {
  imageKey: string | null | undefined;
  alt?: string;
  className?: string;
  sizes?: string;
  /** Set on the one image above the fold; it is what LCP measures. */
  priority?: boolean;
  fallbackClassName?: string;
}) {
  const src = imageUrl(imageKey);

  if (!src) {
    return (
      <div
        aria-hidden
        className={cn(
          'size-full bg-[linear-gradient(140deg,#f4efe5,#e4d8c4)]',
          className,
          fallbackClassName,
        )}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
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
