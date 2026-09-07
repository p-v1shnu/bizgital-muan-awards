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
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('section-reveal-content', visible && 'is-visible')}>
      {children}
    </div>
  );
}
