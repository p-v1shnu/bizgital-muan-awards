import { cn } from '@/lib/utils';
import { SiteImage } from './site-image';

const WINDOW_COUNT = 6;
/** More than this many uploaded photos never fit on screen at once regardless
 *  — capping here bounds how many `<Image>` elements the section ever
 *  renders (each window doubles its slice of the pool for a seamless loop),
 *  rather than growing with however large the team's library gets. The
 *  admin's own ordering decides which 8 are in rotation; reordering the
 *  library there is how the team changes it. */
const POOL_SIZE = 8;
/** [seconds for one full loop, reverse direction?] per window, in visual
 *  order (the first is the big 2×2 box). Deliberately not identical across
 *  windows — same speed and direction everywhere would read as one
 *  mechanism instead of a wall of separate photos. */
const WINDOW_MOTION: readonly [number, boolean][] = [
  [56, false],
  [32, true],
  [40, false],
  [30, true],
  [36, false],
  [44, true],
];

/**
 * The homepage's "about" section gallery (PRD §6.0.3). Once the team has
 * uploaded more photos than fit in six boxes, each box becomes a window onto
 * a strip of them that scrolls upward on a continuous loop instead of only
 * ever showing the first six and leaving the rest sitting unused in the
 * library — the loop has no seam because the strip is the pool doubled and
 * scrolled by exactly one pool's height.
 *
 * Plain CSS throughout — the loop, the hover pause and the reduced-motion
 * freeze in globals.css — so this needs no client component: a photo
 * library is exactly the kind of content a search engine should still be
 * able to read without running any JavaScript.
 */
export function PhotoWall({ imageKeys }: { imageKeys: string[] }) {
  const pool = imageKeys.slice(0, POOL_SIZE);
  const scrolling = pool.length > WINDOW_COUNT;
  const slots: (string | null)[] = pool.length > 0 ? pool : Array.from({ length: WINDOW_COUNT }, () => null);

  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: WINDOW_COUNT }, (_, windowIndex) => {
        const big = windowIndex === 0;
        const boxClassName = cn(
          'relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-rule bg-panel-2',
          big && 'col-span-2 row-span-2',
        );

        if (!scrolling) {
          const key = slots[windowIndex] ?? null;
          return (
            <div key={windowIndex} className={cn('group', boxClassName)}>
              {key ? (
                <SiteImage
                  imageKey={key}
                  alt="ບັນຍາກາດງານ ມ່ວນອາວອດສ໌"
                  sizes="(max-width: 768px) 33vw, 200px"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="size-full border border-dashed border-rule" />
              )}
            </div>
          );
        }

        // Every window draws from the same pool, just starting at a
        // different point in it, so the same photo is never in two windows
        // on the same beat.
        const offset = windowIndex % pool.length;
        const order = pool.map((_, i) => pool[(i + offset) % pool.length]);
        const [duration, reverse] = WINDOW_MOTION[windowIndex];

        return (
          <div key={windowIndex} className={boxClassName}>
            <div
              className={cn('photo-wall-strip', reverse && 'is-reverse')}
              style={{ animationDuration: `${duration}s` }}
            >
              {[...order, ...order].map((key, tileIndex) => (
                <div key={tileIndex} className="relative aspect-square w-full">
                  <SiteImage
                    imageKey={key}
                    alt="ບັນຍາກາດງານ ມ່ວນອາວອດສ໌"
                    sizes="(max-width: 768px) 33vw, 200px"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
