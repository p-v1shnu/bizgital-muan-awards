'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Play } from 'lucide-react';

import { detectVideoProvider, videoEmbedUrl, youtubeThumbnailUrl } from '@/lib/video-embed';
import { imageUrl } from '@/lib/images';

/**
 * The homepage's own video, independent of any year (PRD §6.0.3) — plays in
 * place, in the same box, never a popup. No visible heading: a big
 * thumbnail with a play button needs no label to be understood as a video,
 * and the content behind it varies too much for one fixed caption to always
 * fit — but an sr-only heading keeps the section a real landmark for anyone
 * navigating by headings.
 *
 * Two modes, set in /admin/site, that cannot both apply at once:
 * - Autoplay on: no click, no poster to show one — it starts on its own
 *   (muted; no browser allows anything louder with no click behind it) once
 *   scrolled into view.
 * - Autoplay off: a poster and a play button, and the video only starts —
 *   unmuted, since a click is a real user gesture — once clicked.
 *
 * Reduced motion overrides the autoplay setting regardless of what the team
 * chose: a video starting to move on its own is exactly the kind of motion
 * that setting exists to suppress, so it falls back to the click-to-play
 * behaviour instead.
 */
export function HighlightVideo({
  videoUrl,
  autoplay,
  thumbnailKey,
}: {
  videoUrl: string;
  autoplay: boolean;
  thumbnailKey: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const effectiveAutoplay = autoplay && !reduceMotion;

  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLImageElement>(null);

  const provider = detectVideoProvider(videoUrl);
  const embedUrl = provider ? videoEmbedUrl(videoUrl, provider, { muted: effectiveAutoplay }) : null;
  const uploadedThumbnail = imageUrl(thumbnailKey);
  const autoThumbnail = provider === 'youtube' ? youtubeThumbnailUrl(videoUrl) : null;
  // Starts at the sharpest option (an upload, or YouTube's 1280×720 tier) and
  // drops to the 480×360 tier only if that turns out not to exist — see
  // checkThumbnailSize below.
  const [thumbnail, setThumbnail] = useState(uploadedThumbnail ?? autoThumbnail);

  // A video with no 1280×720 thumbnail still answers this request with a 200
  // — just a ~120×90 grey placeholder — so a 404 handler would never catch
  // it. The loaded image's own size is the only signal available, and only
  // for the auto-derived YouTube tier: an upload the team chose is shown
  // as-is.
  function checkThumbnailSize(img: HTMLImageElement) {
    if (
      uploadedThumbnail ||
      provider !== 'youtube' ||
      thumbnail !== autoThumbnail ||
      img.naturalWidth > 120
    ) {
      return;
    }
    const fallback = youtubeThumbnailUrl(videoUrl, 'hqdefault');
    if (fallback) setThumbnail(fallback);
  }

  // The plain onLoad prop below is not enough on its own: on a fast enough
  // response (a cached image, most likely) the browser can finish loading it
  // before React finishes hydrating and attaches that listener — confirmed
  // directly, a fixture answering instantly reproduced this exact miss, and
  // answering with realistic latency did not. `complete` is a live property,
  // so checking it once after mount catches a load that already happened.
  useEffect(() => {
    if (effectiveAutoplay) return;
    const img = thumbnailRef.current;
    if (img?.complete) checkThumbnailSize(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnail, effectiveAutoplay]);

  // Autoplay mode only: starts the video once the box is actually on
  // screen, rather than the instant the page loads — a visitor who never
  // scrolls this far never pays for it.
  useEffect(() => {
    if (!effectiveAutoplay || started) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setStarted(true);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [effectiveAutoplay, started]);

  // Nothing to embed — an unrecognised link, most likely. Refusing to render
  // is safer than a box that never plays anything.
  if (!provider || !embedUrl) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
      <h2 className="sr-only">ວິດີໂອ</h2>
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel-2"
      >
        {started ? (
          <iframe
            src={embedUrl}
            title="ວິດີໂອ"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        ) : effectiveAutoplay ? null : (
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label="ເປີດວິດີໂອ"
            className="group absolute inset-0 block"
          >
            {thumbnail ? (
              // External storage and YouTube's own CDN alike are not
              // configured Next.js image hosts, so this stays a plain img
              // (same call as the admin's own upload preview).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={thumbnailRef}
                src={thumbnail}
                alt=""
                className="size-full object-cover"
                onLoad={(event) => checkThumbnailSize(event.currentTarget)}
              />
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
        )}
      </div>
    </section>
  );
}
