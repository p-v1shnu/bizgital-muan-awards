import { SiteFooter, SiteHeader } from '@/components/site/chrome';

/** The visitor-facing shell. The back office sits outside this group. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
