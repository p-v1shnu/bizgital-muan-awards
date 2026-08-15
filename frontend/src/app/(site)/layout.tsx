import { SiteShell } from '@/components/site/shell';

/** The visitor-facing shell. The back office sits outside this group. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
