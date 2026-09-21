'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Play } from 'lucide-react';

import { detectVideoProvider, videoEmbedUrl, youtubeThumbnailUrl } from '@/lib/video-embed';
import { imageUrl } from '@/lib/images';
import { averageColor } from '@/lib/average-color';
import { cn } from '@/lib/utils';

// The brand purple (--color-brand / --color-brand-deep in globals.css),
// duplicated as plain RGB rather than imported: there is nothing here to
// import from, since the token only exists as a CSS custom property, and
// this is the one colour the glow falls back to when there is no thumbnail
// to sample — a non-YouTube link with no poster uploaded in /admin/site.
const BRAND_GLOW: [number, number, number] = [141, 62, 168];

function lighten([r, g, b]: [number, number, number], amount: number): string {
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `${mix(r)}, ${mix(g)}, ${mix(b)}`;
}

/**
 * The homepage's own video, independent of any year (PRD §6.0.3) — plays in
 * place, in the same box, never a popup. The heading is fixed, since it
 * names the section rather than the clip inside it; what the clip actually
 * is goes in descriptionLo instead, which the team rewrites whenever they
 * swap the video. Its own dark band (bg-ink, the same tone the stats
 * section further down uses), rather than the page's own paper background,
 * sets it apart the way a projector room does.
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
  descriptionLo,
}: {
  videoUrl: string;
  autoplay: boolean;
  thumbnailKey: string | null;
  /** What this particular video is — the team's, edited whenever the video changes. */
  descriptionLo: string | null;
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

  // The ambient glow behind the player (a YouTube "ambient mode" ask):
  // there is no way to sample the actual playing frames — it's a
  // cross-origin iframe, not a <video> element this page owns — so the
  // closest approximation is the thumbnail's own average colour, sampled
  // once. Anything a canvas can't read (no thumbnail, a load failure, a
  // CORS-blocked image) keeps the brand-purple fallback instead.
  const [glowColor, setGlowColor] = useState<[number, number, number]>(BRAND_GLOW);
  useEffect(() => {
    // Nothing to sample — the default state above is already the fallback.
    // thumbnail only ever moves from unset to a URL (or to a sharper one),
    // never back, so there is no case here to reset it in.
    if (!thumbnail) return;
    let cancelled = false;
    averageColor(thumbnail).then((color) => {
      if (!cancelled) setGlowColor(color ?? BRAND_GLOW);
    });
    return () => {
      cancelled = true;
    };
  }, [thumbnail]);
  // Reference equality is enough: the state is either still this exact
  // constant (never sampled, or sampling failed) or a fresh array
  // averageColor built — the two are never accidentally interchangeable.
  const usingFallbackGlow = glowColor === BRAND_GLOW;

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
    // overflow-x-hidden: the glow below bleeds past the player's own edges
    // on purpose, but on a narrow viewport that same bleed reaches past the
    // section's own width too — the section is exactly where that belongs,
    // rather than pushing the page's scrollable width out with it.
    <section className="overflow-x-hidden bg-ink py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <header className="mb-8 max-w-2xl">
          {/* "ມ່ວນອາວອດສ໌" never wrapped — see chrome.tsx's own header mark for
              the same fix: the browser's Lao line-breaker doesn't know this
              brand name and splits it mid-syllable ("ມ່ວນອາວ / ອດສ໌")
              otherwise. */}
          <p className="text-[10.5px] font-bold uppercase text-brand-edge">
            ຈາກ<span className="whitespace-nowrap">ມ່ວນອາວອດສ໌</span>
          </p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-white md:text-4xl">
            ວິດີໂອໄຮໄລທ໌
          </h2>
          {descriptionLo && (
            <p className="mt-3 font-sans-looped text-[15px] leading-relaxed text-white/70">{descriptionLo}</p>
          )}
        </header>
        <div className="relative">
          {/* The ambient glow: a copy of the player's own box, filled edge to
              edge with two colour blobs (the thumbnail's average, or the
              brand purple with none to sample), scaled up and blurred
              behind the real player. Scaling the whole filled shape is what
              gets a visible halo past the box's edge — a gradient merely
              inset further out and blurred just fades its tail away to
              nothing before it clears the player.

              No z-index here, on purpose: the video box below sits later in
              this same markup, so plain paint order already puts it on top
              — the first version of this reached for z-index/isolate to do
              the same job and, without a stacking context anywhere nearby
              to contain a negative one, ended up buried under the whole
              section's own background instead.

              Split into two layers rather than one: the outer fades opacity
              in on mount so the glow doesn't just snap to visible the
              instant the video starts, and the inner is the one actually
              carrying the drifting/breathing animation — a single element
              can't run a CSS transition and a CSS animation on the same
              property (opacity) at once, so the fade-in and the pulse each
              get their own. */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 transition-opacity duration-1000 ease-out',
              started ? 'opacity-100' : 'opacity-0',
            )}
          >
            <div
              className={cn(
                'ambient-glow absolute inset-0 rounded-[var(--radius-box)] blur-2xl',
                // Only the flat brand-purple fallback drifts hue — a colour
                // actually sampled from the thumbnail is left as it is.
                usingFallbackGlow && 'hue-drift',
              )}
              style={{
                background: `radial-gradient(circle at 30% 30%, rgb(${lighten(glowColor, 0.35)}) 0%, transparent 65%), radial-gradient(circle at 70% 70%, rgb(${glowColor.join(', ')}) 0%, transparent 65%)`,
              }}
            />
          </div>
          <div
            ref={containerRef}
            className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-box)] border border-white/15 bg-black/40"
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
        </div>
      </div>
    </section>
  );
}
