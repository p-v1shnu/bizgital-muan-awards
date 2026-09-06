'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Wraps the actual <header> element so its shadow/background can react to
 * scroll position — the only reason this exists as a client component at
 * all. SiteHeader itself stays a server component (it awaits two API calls
 * for nav items); this never touches its content, only the shell around
 * whatever it renders as children.
 */
export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b backdrop-blur transition-[box-shadow,background-color,border-color] duration-200',
        scrolled
          ? 'border-rule bg-paper/95 shadow-[0_8px_24px_-16px_rgba(34,28,25,0.35)]'
          : 'border-rule/70 bg-paper/85 shadow-none',
      )}
    >
      {children}
    </header>
  );
}
