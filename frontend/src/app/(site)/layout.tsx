import { GoogleAnalytics } from '@next/third-parties/google';

import { SiteFooter, SiteHeader } from '@/components/site/chrome';

/**
 * Measurement starts with the page, as the team asked — there is no banner to
 * agree to. It is only on the visitor-facing pages: the back office is the
 * team's own work and is nobody's business to measure.
 *
 * Absent unless NEXT_PUBLIC_GA_ID is set, so development and the test runs
 * never send anything. The id is read at build time like every NEXT_PUBLIC
 * value, so changing it needs a rebuild (docs/deployment.md).
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </div>
  );
}
