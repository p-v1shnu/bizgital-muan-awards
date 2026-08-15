/**
 * What the pages say about themselves to a machine.
 *
 * The point of this site is that a creator's history accumulates in one place
 * (PRD §7.5) — that only reaches anyone through search if the page says, in a
 * form a search engine reads, that this is a person and these are awards they
 * were nominated for. Written as plain objects so each page can render one
 * script tag without a library.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com';

export const siteUrl = (path = '') => `${SITE}${path}`;

export function organisationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Muan Awards',
    alternateName: 'ມ່ວນ ອະວອດ',
    url: siteUrl(),
    logo: siteUrl('/brand/horizontal-full-color.png'),
  };
}

export function editionJsonLd(edition: {
  titleLo: string;
  year: number;
  slug: string;
  descriptionLo: string | null;
  eventDate: string | null;
  venueLo: string | null;
  heroUrl: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: edition.titleLo,
    url: siteUrl(`/awards/${edition.slug}`),
    ...(edition.descriptionLo ? { description: edition.descriptionLo } : {}),
    ...(edition.eventDate ? { startDate: edition.eventDate } : {}),
    ...(edition.heroUrl ? { image: [edition.heroUrl] } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(edition.venueLo
      ? { location: { '@type': 'Place', name: edition.venueLo, address: edition.venueLo } }
      : {}),
    organizer: { '@type': 'Organization', name: 'Muan Awards', url: siteUrl() },
  };
}

export function creatorJsonLd(creator: {
  nameLo: string;
  nameEn: string | null;
  slug: string;
  bioLo: string | null;
  avatarUrl: string | null;
  appearances: { year: number; categoryNameLo: string; isWinner: boolean }[];
}) {
  const wins = creator.appearances.filter((appearance) => appearance.isWinner);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creator.nameLo,
    ...(creator.nameEn ? { alternateName: creator.nameEn } : {}),
    url: siteUrl(`/creators/${creator.slug}`),
    ...(creator.bioLo ? { description: creator.bioLo } : {}),
    ...(creator.avatarUrl ? { image: creator.avatarUrl } : {}),
    ...(wins.length
      ? { award: wins.map((win) => `${win.categoryNameLo} · Muan Awards ${win.year}`) }
      : {}),
  };
}

/** One script tag, escaped so a stray `<` in the data cannot close it early. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
