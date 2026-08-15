import { SiteFooter, SiteHeader } from '@/components/site/chrome';

/** The visitor-facing shell. The back office sits outside this group. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-paper">
      {/* Hidden until it has focus: the first thing a keyboard or screen reader
          reaches, so the nav does not have to be walked through on every page. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-btn)] focus:bg-brand-deep focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-white"
      >
        ຂ້າມໄປເນື້ອຫາຫຼັກ
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
