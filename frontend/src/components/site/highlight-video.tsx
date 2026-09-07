'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Play, X } from 'lucide-react';

import { detectVideoProvider, videoEmbedUrl, youtubeThumbnailUrl } from '@/lib/video-embed';
import { imageUrl } from '@/lib/images';

/**
 * The homepage's own video, independent of any year (PRD §6.0.3) — a lightbox
 * rather than a link out, so watching it never leaves the site. No visible
 * heading: a big thumbnail with a play button needs no label to be understood
 * as a video, and the content behind it varies too much for one fixed
 * caption to always fit — but an sr-only heading keeps the section a real
 * landmark for anyone navigating by headings.
 */
export function HighlightVideo({
  videoUrl,
  thumbnailKey,
}: {
  videoUrl: string;
  thumbnailKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const provider = detectVideoProvider(videoUrl);
  const embedUrl = provider ? videoEmbedUrl(videoUrl, provider) : null;
  const thumbnail = imageUrl(thumbnailKey) ?? (provider === 'youtube' ? youtubeThumbnailUrl(videoUrl) : null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Nothing to embed — an unrecognised link, most likely — so nothing to
  // open on click either. Refusing to render is safer than a lightbox that
  // opens onto a blank iframe.
  if (!provider || !embedUrl) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
      <h2 className="sr-only">ວິດີໂອ</h2>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ເປີດວິດີໂອ"
        className="group relative block aspect-video w-full overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel-2"
      >
        {thumbnail ? (
          // External storage and YouTube's own CDN alike are not configured
          // Next.js image hosts, so this stays a plain img (same call as the
          // admin's own upload preview).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="size-full object-cover" />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/50 via-ink/10 to-transparent transition-colors group-hover:from-ink/60"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-white/90 text-ink shadow-[0_4px_18px_rgba(20,14,10,.25)] transition-transform group-hover:scale-105">
            <Play className="ml-1 size-6 fill-current" />
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="ວິດີໂອ"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={close}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="ປິດ"
              onClick={close}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            <motion.div
              className="relative aspect-video w-full max-w-3xl"
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <iframe
                src={embedUrl}
                title="ວິດີໂອ"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="size-full rounded-[var(--radius-box)]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
