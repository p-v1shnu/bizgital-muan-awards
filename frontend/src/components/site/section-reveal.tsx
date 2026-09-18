'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Reveals a section with a fade-up as it scrolls into view — PRD §6.0.3's
 * answer for "does scrolling feel considered". An earlier version wiped the
 * section open along the weave motif's 45° angle; on a wide desktop viewport
 * that read as a card being flipped open rather than a section arriving, so
 * it was replaced with a plain fade + slight upward settle.
 *
 * A row of parallel cards/tiles inside the children can additionally mark
 * each item with the `stagger-item` class (globals.css) to have them fade up
 * one after another instead of all at once.
 *
 * Section skips wrapping its leading (titleAs="h1") content in this: that
 * section is on screen at first paint on every page that has one, and
 * revealing it only once scrolled to would mean a page whose own h1 is
 * hidden at rest.
 */
export function SectionReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      setVisible(true);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        reveal();
      },
      // threshold 0 (any pixel at all) rather than an area fraction: a
      // fraction of the section's own height is what made this feel slow on
      // a phone — stacked to one column there, a tall row of tiles needs far
      // more scrolling before 20% of it is on screen, even though the top of
      // the section already arrived. rootMargin's -5% keeps the trigger from
      // firing on a sliver at the very bottom edge, which read as premature.
      { threshold: 0, rootMargin: '0px 0px -5% 0px' },
    );
    observer.observe(el);

    // IntersectionObserver only calls back when the ratio *crosses* a
    // threshold. A fast fling, an End-key jump, or a browser restoring a
    // scrolled position can move the viewport clean past a section — from
    // "not yet reached" straight to "already above it" — in a single frame
    // that never renders an in-between state where the ratio crossed 20%.
    // The observer then never fires again, and the section sits at opacity
    // 0 forever with its links still live underneath. This falls back to
    // reading the section's actual position once it has fully left the top
    // of the viewport, which needs no crossing and so has no such gap.
    const checkPosition = () => {
      if (el.getBoundingClientRect().bottom <= 0) reveal();
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        checkPosition();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Also once up front: a scroll that happens before this effect has run —
    // a hash link, a restored history position, a script-driven jump — can
    // land the page already past the section with no 'scroll' event left to
    // fire afterwards. Safe to check unconditionally, since a section that
    // has not been reached yet always has bottom > 0 and stays untouched.
    checkPosition();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={cn('section-reveal-content', visible && 'is-visible')}>
      {children}
    </div>
  );
}
