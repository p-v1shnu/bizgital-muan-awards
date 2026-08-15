import { NextResponse } from 'next/server';

/**
 * Answers "is this Node process still serving?" and nothing more.
 *
 * Deliberately does not touch the API or the database. Those have their own
 * probe at `/api/v1/health`, and a container check that fails because a
 * *different* container is sick would restart the wrong thing. Rendering the
 * homepage would have the same problem — it calls the API — besides costing a
 * full render every few seconds.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
