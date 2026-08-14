import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Clears the public cache when the back office changes something (PRD §9).
 *
 * The whole site is cleared rather than individual paths. One edit can touch
 * several pages at once — crowning a winner changes the year page, the
 * category page, the hall of winners, that creator's profile and the homepage
 * strip — and a list of paths that has to be kept in step with the pages is a
 * list that will eventually be wrong. The site is small enough that
 * rebuilding it costs less than getting that list subtly wrong.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  // Without a configured secret the endpoint stays shut, rather than
  // defaulting to something guessable.
  if (!secret) {
    return NextResponse.json({ message: 'Revalidation is not configured' }, { status: 503 });
  }
  if (request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
