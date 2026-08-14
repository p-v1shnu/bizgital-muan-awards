import { notFound, redirect } from 'next/navigation';

import { getPublic } from '@/lib/api/server';
import type { Edition } from '@/types/api';

/**
 * Resolved per request. Prerendering this would bake in whatever the newest
 * year was at build time — and if the database was empty then, it would bake
 * in a 404 that outlives the problem.
 */
export const dynamic = 'force-dynamic';

/**
 * A stable URL to hand out in print and on social, so a poster does not tie
 * itself to one year. It resolves to the newest year the public may see —
 * the nav's meaning of "latest" (PRD §4.3.1).
 */
export default async function LatestAwardsPage() {
  const latest = await getPublic<Edition>('/editions/latest', { revalidate: 0 });
  if (!latest) notFound();
  redirect(`/awards/${latest.slug}`);
}
