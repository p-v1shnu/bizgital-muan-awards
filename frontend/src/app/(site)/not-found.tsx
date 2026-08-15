import type { Metadata } from 'next';

import { NOT_FOUND_TITLE, NotFoundBody } from '@/components/site/not-found-body';

export const metadata: Metadata = { title: NOT_FOUND_TITLE };

/**
 * For a page that matched a route and then called notFound() — a year that
 * does not exist, a creator who was removed. It is already inside the site
 * layout, so it renders the body alone: adding the shell here would put a
 * second header, footer and <main> on the page.
 */
export default function SiteNotFound() {
  return <NotFoundBody />;
}
