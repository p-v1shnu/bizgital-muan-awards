import { cn } from '@/lib/utils';

/**
 * The brandmark, very faint, behind a block of content — the motif the approved
 * mockups put in the footer and at the top of every secondary page
 * (docs/design/home.html `.mu-foot .wm`, docs/design/pages.html `.mu-hero .wm`)
 * and that the build never carried over.
 *
 * A CSS background rather than an <img> or an inlined <svg>: the mark's path
 * data is 37 KB, which would be 37 KB of HTML on every page it decorates and
 * again on the next one, while a file is fetched once and then cached for the
 * whole visit. It also keeps the mark out of the accessibility tree without
 * having to remember an aria-hidden on each use.
 *
 * `tone` picks the artwork rather than recolouring it: BrandMark ships as a real
 * vector in both black and white, so no filter or mask is involved.
 *
 * Sizing and placement belong to the caller, because "faint" is not one number.
 * The mark is dense line art: at a small size and low opacity it stops reading
 * as a mark and starts reading as dirt on the screen. On ink, 5–7% works at
 * 300px; on paper the lines need more room, so go larger and lighter (3–4%).
 */
export function Watermark({
  tone = 'dark',
  className,
}: {
  /** 'light' = the white mark, for the ink ground. 'dark' = ink, for paper. */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute bg-contain bg-no-repeat bg-center select-none',
        className,
      )}
      style={{
        backgroundImage: `url(/brand/${tone === 'light' ? 'brandmark-light' : 'brandmark'}.svg)`,
      }}
    />
  );
}
