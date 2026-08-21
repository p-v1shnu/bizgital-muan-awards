'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The header's destinations on a phone, behind one button.
 *
 * Laid out in a row they did not fit: three Lao labels, the site name and the
 * "send a name" button on a 390px screen wrapped the header onto two lines. The
 * previous answer was to hide "ກ່ຽວກັບງານ" below `sm`, which fits by making the
 * page unreachable from the header — and would have to hide another item the
 * next time one is added (a judges page is already planned, PRD §6.1.1).
 *
 * The list is passed in rather than fetched here: which year the first item
 * points at is the server's business (SiteHeader already asks), and this
 * component only needs to be a client for the open/closed state.
 */
export function MobileNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  /**
   * Which page the panel was opened on, rather than a plain "is it open".
   *
   * The header lives in the layout and is not remounted by a navigation, so a
   * boolean would leave the panel hanging open over the page the visitor just
   * asked for. Storing the path it was opened on makes the answer derived: the
   * moment the path changes, this no longer matches and the panel is shut,
   * without an effect that reaches back into state to close it.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = () => setOpenedOn(null);
  const button = useRef<HTMLButtonElement>(null);

  // Escape closes it and hands focus back to the button that opened it —
  // otherwise focus is left inside a panel that is no longer on screen.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenedOn(null);
      button.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? 'ປິດເມນູ' : 'ເປີດເມນູ'}
        onClick={() => setOpenedOn(open ? null : pathname)}
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-2 hover:bg-panel-2 hover:text-ink',
          className,
        )}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* A tap anywhere else closes it, which is what a phone expects of an
          open menu. It starts at the bottom of the header rather than covering
          the whole window: it is a child of the header, so covering the window
          would cover the very button that closes it. */}
      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={close}
          className="absolute inset-x-0 top-full z-30 h-screen cursor-default bg-ink/20 md:hidden"
        />
      )}

      {/*
        `hidden` rather than unmounted: the button's aria-controls has to point
        at something that exists, and a hidden element is not announced or
        focusable, so nothing leaks to a screen reader either.

        Anchored to the header rather than the viewport — the header is sticky,
        so the panel travels with it and cannot come adrift of its own button.
      */}
      <div
        id="site-menu"
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b border-rule bg-paper shadow-[0_18px_40px_-28px_rgba(34,28,25,0.55)] md:hidden"
      >
        <ul className="mx-auto max-w-6xl px-5 py-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                className="block border-b border-rule/50 py-3.5 text-[15px] text-ink last:border-0 hover:text-brand-deep"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
