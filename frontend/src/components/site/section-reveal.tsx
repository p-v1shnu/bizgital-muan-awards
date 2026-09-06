'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Reveals a section with a diagonal wipe at the same 45° angle as the
 * site's own weave motif (globals.css .weave), with the foil gradient
 * riding the seam as it crosses — PRD §6.0.3's answer for "does scrolling
 * feel considered", reusing the site's own decorative language instead of
 * a generic fade-up.
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
    <div ref={ref} className="relative overflow-hidden">
      <span aria-hidden className={cn('section-reveal-seam', visible && 'is-crossing')} />
      <div className={cn('section-reveal-content', visible && 'is-visible')}>{children}</div>
    </div>
  );
}
