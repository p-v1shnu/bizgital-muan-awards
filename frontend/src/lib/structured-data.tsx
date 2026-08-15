/**
 * What the pages say about themselves to a machine.
 *
 * The point of this site is that a creator's history accumulates in one place
 * (PRD §7.5) — that only reaches anyone through search if the page says, in a
 * form a search engine reads, that this is a person and these are awards they
 * were nominated for. Written as plain objects so each page can render one
 * script tag without a library.
 */
import { safeHttpUrl } from '@/lib/utils';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com';

export const siteUrl = (path = '') => `${SITE}${path}`;

/** The organisation, referred to rather than repeated in full each time. */
const ORGANISER = { '@type': 'Organization', name: 'Muan Awards', url: siteUrl() } as const;

interface PersonLike {
  nameLo: string;
  nameEn?: string | null;
  slug?: string;
  avatarUrl?: string | null;
  socialLinks?: Record<string, string> | null;
}

/**
 * One person, in the form used wherever people appear — a nominee, a winner, a
 * judge — so the same creator carries the same shape on every page they show up
 * on and a machine can join them together.
 *
 * `sameAs` is the part that does the joining. The team already types a
 * creator's Facebook, TikTok and YouTube into the back office and the profile
 * page already links them, but until now nothing said they were the *same
 * person* — which is exactly the claim a search engine or an assistant needs to
 * connect "ຄຳຫຼ້າ, winner here" to the account someone actually follows. The
 * links are filtered the same way the visible ones are: anything that is not
 * http(s) is dropped rather than published.
 */
export function personJsonLd(person: PersonLike) {
  const sameAs = Object.values(person.socialLinks ?? {})
    .map(safeHttpUrl)
    .filter((url): url is string => Boolean(url));

  return {
    '@type': 'Person',
    name: person.nameLo,
    // The Latin spelling matters more here than on the page. A question asked
    // in English — "who won Muan Awards 2025" — has nothing to match against a
    // site written entirely in Lao script.
    ...(person.nameEn ? { alternateName: person.nameEn } : {}),
    ...(person.slug ? { url: siteUrl(`/creators/${person.slug}`) } : {}),
    ...(person.avatarUrl ? { image: person.avatarUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * The trail above the page. Search results show it in place of a raw URL, and
 * it is the cheapest way to say that a category belongs to a year which
 * belongs to the awards, rather than being three unrelated pages.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: siteUrl(step.path),
    })),
  };
}

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
  titleEn?: string | null;
  year: number;
  slug: string;
  descriptionLo: string | null;
  eventDate: string | null;
  venueLo: string | null;
  heroUrl: string | null;
  sponsors?: { name: string; websiteUrl: string | null }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: edition.titleLo,
    ...(edition.titleEn ? { alternateName: edition.titleEn } : {}),
    url: siteUrl(`/awards/${edition.slug}`),
    ...(edition.descriptionLo ? { description: edition.descriptionLo } : {}),
    ...(edition.eventDate ? { startDate: edition.eventDate } : {}),
    ...(edition.heroUrl ? { image: [edition.heroUrl] } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(edition.venueLo
      ? { location: { '@type': 'Place', name: edition.venueLo, address: edition.venueLo } }
      : {}),
    organizer: ORGANISER,
    ...(edition.sponsors?.length
      ? {
          sponsor: edition.sponsors.map((sponsor) => ({
            '@type': 'Organization',
            name: sponsor.name,
            ...(safeHttpUrl(sponsor.websiteUrl) ? { url: sponsor.websiteUrl } : {}),
          })),
        }
      : {}),
  };
}

/**
 * The panel for one year.
 *
 * Schema.org has no "judge" property on an Event, so this is a list in its own
 * right rather than something hung off the event. Without it the panel exists
 * only as text in a card: the site could answer who was nominated but not who
 * decided, which is half of what makes an award an award.
 */
export function judgePanelJsonLd(
  edition: { titleLo: string; slug: string },
  judges: (PersonLike & { positionLo: string; role: string })[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `ຄະນະກຳມະການ · ${edition.titleLo}`,
    url: siteUrl(`/awards/${edition.slug}`),
    itemListElement: judges.map((judge, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        ...personJsonLd(judge),
        jobTitle: judge.positionLo,
        ...(judge.role === 'CHAIR' ? { roleName: 'Jury Chair' } : {}),
      },
    })),
  };
}

/**
 * One category and everyone in it.
 *
 * This is the page a search actually wants — "who was nominated for video of
 * the year 2025" — and until now it was the only public page carrying no
 * structured data at all. The winner is stated twice on purpose: once as the
 * list's own answer, and once on the person, because the two questions
 * ("who won this") and ("what has this person won") are asked separately and
 * arrive at different pages.
 */
export function categoryJsonLd(page: {
  nameLo: string;
  nameEn: string | null;
  descriptionLo: string | null;
  slug: string;
  edition: { titleLo: string; slug: string; year: number };
  nominees: { isWinner: boolean; creator: PersonLike }[];
}) {
  const award = `${page.nameLo} · ${page.edition.titleLo}`;
  const winner = page.nominees.find((nominee) => nominee.isWinner);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: award,
    ...(page.nameEn ? { alternateName: page.nameEn } : {}),
    ...(page.descriptionLo ? { description: page.descriptionLo } : {}),
    url: siteUrl(`/awards/${page.edition.slug}/${page.slug}`),
    isPartOf: {
      '@type': 'Event',
      name: page.edition.titleLo,
      url: siteUrl(`/awards/${page.edition.slug}`),
      organizer: ORGANISER,
    },
    ...(winner ? { mainEntity: { ...personJsonLd(winner.creator), award } } : {}),
    itemListElement: page.nominees.map((nominee, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        ...personJsonLd(nominee.creator),
        ...(nominee.isWinner ? { award } : {}),
      },
    })),
  };
}

/** The archive page — every year, and who won the featured categories. */
export function winnersArchiveJsonLd(
  years: { titleLo: string; slug: string; year: number }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ທຳນຽບຜູ້ຊະນະ · Muan Awards',
    url: siteUrl('/winners'),
    about: ORGANISER,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: years.map((edition, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: edition.titleLo,
        item: siteUrl(`/awards/${edition.slug}`),
      })),
    },
  };
}

export function creatorJsonLd(creator: {
  nameLo: string;
  nameEn: string | null;
  slug: string;
  bioLo: string | null;
  avatarUrl: string | null;
  socialLinks: Record<string, string> | null;
  appearances: {
    year: number;
    editionSlug: string;
    categorySlug: string;
    categoryNameLo: string;
    isWinner: boolean;
  }[];
}) {
  const wins = creator.appearances.filter((appearance) => appearance.isWinner);
  return {
    '@context': 'https://schema.org',
    ...personJsonLd({
      nameLo: creator.nameLo,
      nameEn: creator.nameEn,
      slug: creator.slug,
      avatarUrl: creator.avatarUrl,
      socialLinks: creator.socialLinks,
    }),
    ...(creator.bioLo ? { description: creator.bioLo } : {}),
    ...(wins.length
      ? { award: wins.map((win) => `${win.categoryNameLo} · Muan Awards ${win.year}`) }
      : {}),
    // Being nominated is part of the record too, and it is the larger part —
    // most people on this site have never won. Without this the page says
    // nothing about the years someone was in the running.
    subjectOf: creator.appearances.map((appearance) => ({
      '@type': 'Event',
      name: `Muan Awards ${appearance.year}`,
      url: siteUrl(`/awards/${appearance.editionSlug}/${appearance.categorySlug}`),
      organizer: ORGANISER,
    })),
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
