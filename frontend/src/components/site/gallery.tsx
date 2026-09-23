'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { SiteImage } from './site-image';

// A quick flick with little travel should swipe just as reliably as a slow
// drag all the way across — weighting offset by velocity (the standard
// Framer Motion carousel formula) catches both, rather than picking one
// fixed distance threshold that's wrong for the other case.
const SWIPE_THRESHOLD = 10000;
function swipePower(offset: number, velocity: number) {
  return Math.abs(offset) * velocity;
}

/**
 * A grid of event photos that opens full-size in a lightbox instead of
 * linking anywhere — there is nowhere further to send a visitor from the
 * night's own photo set (unlike the homepage's curated preview, which links
 * onward to the year page these live on).
 *
 * `visibleCount` caps how many tiles the grid itself shows (the homepage
 * only has room to feature a handful) without capping the set the lightbox
 * can page through — Next/Prev keeps going past the last visible tile, all
 * the way through whatever the team uploaded, rather than looping back
 * after only the first few. Omit it where the grid already shows every
 * photo (a year's own gallery) and there is nothing extra to reach.
 */
export function Gallery({
  imageKeys,
  alt,
  visibleCount,
}: {
  imageKeys: string[];
  alt: string;
  visibleCount?: number;
}) {
  const shown = imageKeys.slice(0, visibleCount ?? imageKeys.length);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Which way the slide should animate from — set by whichever of
  // button/keyboard/swipe triggered the change, so all three feel like the
  // same gesture instead of swipe sliding while the buttons merely fade.
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpenIndex((current) => {
      // `current` can point past the tiles actually rendered — Next/Prev
      // reaches photos the grid never gave a trigger to. The nearest real
      // trigger is the closest thing to "where this was opened from".
      if (current !== null) triggers.current[Math.min(current, shown.length - 1)]?.focus();
      return null;
    });
  };

  const go = (delta: 1 | -1) => {
    setDirection(delta);
    setOpenIndex((i) => (i === null ? i : (i + delta + imageKeys.length) % imageKeys.length));
  };

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);
    if (power < -SWIPE_THRESHOLD) go(1);
    else if (power > SWIPE_THRESHOLD) go(-1);
  };

  // Same pattern as MobileNav: Escape closes it and hands focus back to the
  // thumbnail that opened it, so focus is never left on an element that just
  // left the screen. Arrow keys page through the set without closing it.
  useEffect(() => {
    if (openIndex === null) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openIndex, imageKeys.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {shown.map((key, index) => (
          <button
            key={key}
            ref={(el) => {
              triggers.current[index] = el;
            }}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-panel-2"
          >
            <SiteImage
              imageKey={key}
              alt={alt}
              sizes="(max-width: 768px) 50vw, 380px"
              className="transition-transform duration-500 group-hover:scale-[1.07]"
            />
            {/* The only visible cue this tile opens something — a plain grid
                gives a mouse user no other reason to expect a click here. */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              aria-hidden
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={close}
          >
            <button
              ref={closeButton}
              type="button"
              aria-label="ປິດ"
              onClick={close}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            {imageKeys.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="ຮູບກ່ອນໜ້າ"
                  onClick={(event) => {
                    event.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="ຮູບຕໍ່ໄປ"
                  onClick={(event) => {
                    event.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}

            {/* relative + each slide absolute: lets the outgoing and incoming
                photo overlap and crossfade in place. Without this, swapping
                `mode="wait"` for a crossfade would briefly render both
                motion.divs as flex siblings and they'd jump side by side
                for the fade's duration instead of sitting on top of each
                other. */}
            <div className="relative h-[min(75vh,700px)] w-full max-w-3xl">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={openIndex}
                  // Not aspect-[4/3] — that's the grid tile's own crop,
                  // right for a uniform wall of thumbnails but wrong for
                  // "view this photo full size": a portrait or 16:9 shot
                  // forced into a 4:3 box here would still be cropped,
                  // exactly what opening it was supposed to undo.
                  // object-contain below never crops regardless of the
                  // photo's own ratio; this box just bounds how large that
                  // letterboxes within.
                  //
                  // Crossfades (both slides visible at once, briefly)
                  // instead of the old exit-then-enter sequence, which made
                  // Next/Prev feel like it queued up and lagged behind taps
                  // when pressed more than once in quick succession. The
                  // slide direction (custom={direction}) makes buttons,
                  // arrow keys and touch swipes all animate the same way,
                  // rather than swipes sliding while the others merely fade.
                  className="absolute inset-0 touch-pan-y"
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({
                      x: reduceMotion ? 0 : dir * 60,
                      opacity: 0,
                    }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({
                      x: reduceMotion ? 0 : dir * -60,
                      opacity: 0,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  drag={imageKeys.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={onDragEnd}
                  onClick={(event) => event.stopPropagation()}
                >
                  <SiteImage
                    imageKey={imageKeys[openIndex]}
                    alt={alt}
                    sizes="100vw"
                    className="pointer-events-none object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
