import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CalendarDays, ChevronDown, ChevronRight, Clock, Eye, MapPin, Play } from 'lucide-react';

import { ActionLink, Avatar, CreatorCard, LaoText, Placeholder, Section } from '@/components/site/primitives';
import { Gallery } from '@/components/site/gallery';
import { NOT_FOUND_TITLE } from '@/components/site/not-found-body';
import { cn, safeHttpUrl } from '@/lib/utils';
import { INK_FALLBACK, SiteImage, SiteImageFixed } from '@/components/site/site-image';
import { apiPath, getPublic, getPublicOrDraft, tryGetPublic } from '@/lib/api/server';
import { JsonLd, breadcrumbJsonLd, editionJsonLd, judgePanelJsonLd, siteUrl } from '@/lib/structured-data';
import { imageKeyList, imageUrl } from '@/lib/images';
import type { Edition, SponsorLogoSize } from '@/types/api';
import type { PublicEdition } from '@/types/public';
import { formatDate, formatDateTime } from '@/lib/dates';

interface PageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const edition = await tryGetPublic<PublicEdition>(apiPath`/editions/${year}`);
  // The same title the 404 page carries, not a wording of its own. The page
  // below calls notFound() on this same miss, so the reader gets the boundary's
  // title first and this one after hydration — two different sentences meant a
  // tab that read "Page not found" and then changed its mind to "Year not
  // found" a moment later.
  if (!edition) return { title: NOT_FOUND_TITLE };

  return {
    title: edition.titleLo,
    description: edition.descriptionLo ?? undefined,
    // The slug, not the requested path: /awards/latest points here too.
    alternates: { canonical: `/awards/${edition.slug}` },
    openGraph: {
      title: edition.titleLo,
      description: edition.descriptionLo ?? undefined,
      images: imageUrl(edition.heroImageKey) ? [imageUrl(edition.heroImageKey) as string] : undefined,
    },
  };
}

/** How many winner rows show before the rest fold away (PRD §7.6). */
const WINNER_ROWS = 12;

/**
 * A tier's chosen size fixes the logo's own frame to a 4:3 box — both
 * height and width, not just a height with width left to follow, which is
 * the actual fix for logos rendering "too wide": the old version only
 * fixed height and let width track whatever ratio that sponsor's own logo
 * happened to be, so a naturally wide/landscape logo had nothing capping
 * how far it stretched. `object-contain` still keeps the real image's own
 * proportions inside this frame — a taller or narrower logo than 4:3 is
 * letterboxed, never cropped or stretched to fill it.
 *
 * M matches the one size every sponsor rendered at before per-tier sizing
 * existed, so nothing already live moves the day this ships.
 *
 * The card around it is this same frame plus a small, fixed gutter (`p-2`
 * below) rather than a separately chosen, much larger box — the first
 * version padded the card out to roughly twice the frame's own size, which
 * read as "a small logo lost in a big box" rather than a logo sized to fill
 * its placeholder.
 */
const LOGO_SIZE: Record<SponsorLogoSize, string> = {
  S: 'h-8 w-[43px]',
  M: 'h-10 w-[53px]',
  L: 'h-14 w-[75px]',
  XL: 'h-18 w-24',
};

interface WinnerRowData {
  category: { id: string; slug: string; nameLo: string };
  winner: { creator: { slug: string; nameLo: string; avatarKey: string | null } };
}

/** Matches the `id` the matching category's own `<details>` carries below. */
function categoryAnchor(slug: string) {
  return `cat-${slug}`;
}

// A winner's card is one link, to the matching category further down this
// same page — a plain fragment link, not a route change. Landing inside a
// closed <details> is a case browsers already handle on their own: they open
// it and scroll it into view, no script needed, so the category one tap away
// expands right where it lives instead of taking over the whole screen with
// a near-duplicate page.
function WinnerTile({ row }: { row: WinnerRowData }) {
  const { category, winner } = row;
  return (
    <a
      href={`#${categoryAnchor(category.slug)}`}
      className="stagger-item group relative flex min-w-0 items-center gap-3 rounded-[var(--radius-box)] border border-rule bg-panel p-4 pr-10 transition-colors hover:border-ink-3"
    >
      <Avatar
        creator={winner.creator}
        size="md"
        className="shrink-0 transition-[transform,border-color] duration-200 group-hover:scale-105 group-hover:border-ink-3"
      />
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase text-ink-3">{category.nameLo}</p>
        <p className="truncate font-serif text-base text-ink group-hover:underline">
          <LaoText text={winner.creator.nameLo} />
        </p>
      </div>
      <ChevronRight
        className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </a>
  );
}

/**
 * Everything about one year. What appears here follows the phase, and that
 * decision is made server-side: this page renders whatever the API chose to
 * send, and never infers a winner from data it was not given (PRD §4.1).
 */
export default async function EditionPage({ params, searchParams }: PageProps) {
  const { year } = await params;
  const { preview } = await searchParams;

  const [edition, allEditions] = await Promise.all([
    getPublicOrDraft<PublicEdition>(apiPath`/editions/${year}`, { preview }),
    getPublic<Edition[]>('/editions'),
  ]);
  if (!edition) notFound();

  const gallery = imageKeyList(edition.galleryImageKeys);
  // One activity per line, typed free-hand in the back office — blank lines and
  // stray whitespace come with that, so they are dropped rather than rendered.
  const activities = (edition.activitiesLo ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // A year that fills in groupLo gets its categories under headings; a year
  // that leaves it blank gets one unnamed group, which renders as a flat list
  // (PRD §7.6). Insertion order is the API's sortOrder, so it is kept.
  const groupedCategories = [
    ...edition.categories
      .reduce((groups, category) => {
        const key = category.groupLo ?? '';
        groups.set(key, [...(groups.get(key) ?? []), category]);
        return groups;
      }, new Map<string, typeof edition.categories>())
      .entries(),
  ];
  const showNominees = edition.categories.some((category) => category.nominees.length > 0);
  const winners = edition.categories
    .map((category) => ({ category, winner: category.nominees.find((n) => n.isWinner) }))
    .filter((row): row is { category: (typeof edition.categories)[number]; winner: NonNullable<typeof row.winner> } =>
      Boolean(row.winner),
    );

  return (
    <>
      <JsonLd
        data={editionJsonLd({
          titleLo: edition.titleLo,
          titleEn: edition.titleEn,
          year: edition.year,
          slug: edition.slug,
          descriptionLo: edition.descriptionLo,
          eventDate: edition.eventDate,
          venueLo: edition.venueLo,
          heroUrl: imageUrl(edition.heroImageKey),
          sponsors: edition.sponsors,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'ໜ້າຫຼັກ', path: '/' },
          { name: edition.titleLo, path: `/awards/${edition.slug}` },
        ])}
      />
      {/* Only once there is a panel to describe — an empty list says nothing
          and would claim the year has no judges rather than none yet. */}
      {edition.judges.length > 0 && (
        <JsonLd
          data={judgePanelJsonLd(edition, edition.judges.map((judge) => ({
            nameLo: judge.nameLo,
            nameEn: judge.nameEn,
            profileUrl: siteUrl(`/judges/${judge.slug}`),
            avatarUrl: imageUrl(judge.avatarKey),
            positionLo: judge.positionLo,
            role: judge.role,
          })))}
        />
      )}

      {/* Two different warnings, and showing the wrong one is worse than showing
          none: a year that is merely unpublished is safe to pass around, while a
          page holding a result nobody has announced yet is not. */}
      {edition.preview && (
        <div className="bg-ink px-5 py-2.5 text-center text-[12.5px] text-[#f0e9df]">
          <Eye className="mr-2 inline size-4" />
          {edition.preview.aheadOfPublic ? (
            <>
              ນີ້ແມ່ນ<b className="mx-1">ພຣີວິວຂອງແອດມິນ</b>— ລາຍຊື່ຜູ້ເຂົ້າຊີງ ຫຼື ຜູ້ຊະນະ ໃນໜ້ານີ້
              <b className="mx-1">ຄົນທົ່ວໄປຍັງເຫັນບໍ່ໄດ້</b>ຈົນກວ່າຈະປະກາດ
            </>
          ) : (
            <>ນີ້ແມ່ນ<b className="mx-1">ພຣີວິວ</b>— ປີນີ້ຍັງບໍ່ໄດ້ເຜີຍແຜ່ ຄົນທົ່ວໄປຍັງເຫັນບໍ່ໄດ້</>
          )}
        </div>
      )}

      {/* 1 — hero: the only place a year is allowed its own look */}
      <section className="relative overflow-hidden bg-panel-2">
        <div className="relative h-[46vh] min-h-[320px]">
          {/* Dark where there is no photograph yet: the title, the venue and
              the buttons below are all white. */}
          <SiteImage
            imageKey={edition.heroImageKey}
            alt={edition.titleLo}
            sizes="100vw"
            priority
            fallbackClassName={INK_FALLBACK}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-8">
            <div className="foil mb-4 h-[3px] w-16 rounded-sm" aria-hidden />
            <h1 className="font-serif text-4xl leading-tight text-white md:text-5xl">
              {edition.titleLo}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/80">
              {edition.eventDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {formatDate(edition.eventDate)}
                </span>
              )}
              {edition.venueLo && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {edition.venueLo}
                </span>
              )}
              {/* The closing date belongs next to the invitation, not buried
                  on the form itself (PRD §4.2). */}
              {edition.acceptingSubmissions && edition.submissionsCloseAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  ປິດຮັບ {formatDateTime(edition.submissionsCloseAt)}
                </span>
              )}
            </div>

            {/* A year that has closed its entries says so, until there is a
                result to show instead — the categories below already carry
                it once winners are announced, so restating "still judging"
                on top of them would just be stale. A year that never took
                any entries — every backfilled one — says nothing at all. */}
            {!edition.acceptingSubmissions &&
              edition.submissionsHaveOpened &&
              edition.phase !== 'WINNERS_ANNOUNCED' && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-ui-sm)] bg-black/35 px-3 py-2 text-[13px] text-white/90 backdrop-blur-sm">
                  <Clock className="size-4 shrink-0" />
                  ປິດຮັບລາຍຊື່ແລ້ວ — ຢູ່ລະຫວ່າງການຄັດກອງ ແລະ ຕັດສິນ
                </p>
              )}

            <div className="mt-5 flex flex-wrap gap-2">
              {/* Driven by the form's own switch, not by the phase. The two are
                  independent (PRD §4) and reading one off the other put the
                  button on a published year with no form open, then took it
                  away the moment nominees were announced while entries were
                  still being taken. */}
              {/* quiet here, not primary: on the photograph a filled cream chip
                  is the one thing that reads as a button, while ink-on-ink
                  would not (see the homepage hero for the same call). */}
              {edition.acceptingSubmissions && (
                <ActionLink href="/submit" tone="quiet" className="px-4 py-2.5 text-[13px]">
                  ສົ່ງລາຍຊື່
                </ActionLink>
              )}
              {/* Outlined rather than filled, as the homepage hero's highlight
                  button is: three quiet chips beside the submit button would
                  compete with it for the same attention.

                  Both gated on phase, not only on the URL being set: buying a
                  ticket or casting a vote for a night that has already
                  happened and announced its winners is not a live action any
                  more, whatever the field still holds. */}
              {edition.phase !== 'WINNERS_ANNOUNCED' && safeHttpUrl(edition.ticketUrl) && (
                <ActionLink
                  href={safeHttpUrl(edition.ticketUrl) as string}
                  tone="quiet"
                  external
                  className="border-white/45 bg-transparent px-4 py-2.5 text-[13px] text-white hover:bg-white/10 hover:text-white"
                >
                  ຊື້ບັດ
                </ActionLink>
              )}
              {edition.phase !== 'WINNERS_ANNOUNCED' && safeHttpUrl(edition.voteUrl) && (
                <ActionLink
                  href={safeHttpUrl(edition.voteUrl) as string}
                  tone="quiet"
                  external
                  className="border-white/45 bg-transparent px-4 py-2.5 text-[13px] text-white hover:bg-white/10 hover:text-white"
                >
                  ໂຫວດ
                </ActionLink>
              )}
              {/* Also here, not only in the homepage hero. There the film shows
                  for one year only — the year before the current one — so
                  without this every older year's film would go out of reach the
                  day a newer one had its own. */}
              {safeHttpUrl(edition.highlightUrl) && (
                <ActionLink
                  href={safeHttpUrl(edition.highlightUrl) as string}
                  tone="quiet"
                  external
                  className="border-white/45 bg-transparent px-4 py-2.5 text-[13px] text-white hover:bg-white/10 hover:text-white"
                >
                  <Play className="size-4 shrink-0" aria-hidden />
                  ເບິ່ງໄຮໄລທ໌ງານ
                </ActionLink>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2 — year switcher */}
      {allEditions && allEditions.length > 1 && (
        <nav aria-label="ເລືອກປີ" className="border-b border-rule bg-panel">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3">
            {allEditions.map((candidate) => (
              <Link
                key={candidate.id}
                href={`/awards/${candidate.slug}`}
                aria-current={candidate.slug === edition.slug ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-1.5 text-[13px]',
                  candidate.slug === edition.slug
                    ? 'border-brand-edge bg-brand-soft font-semibold text-brand-deep'
                    : 'border-rule text-ink-2 hover:bg-panel-2 hover:text-ink',
                )}
              >
                {candidate.year}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {edition.descriptionLo && (
        <Section className="py-6 md:py-8">
          <p className="max-w-2xl font-sans-looped text-[15px] leading-[1.85] text-ink-2">{edition.descriptionLo}</p>
        </Section>
      )}

      {/* 3 — the results table, once there are results. Ahead of the
          categories on purpose: on the one day of the year everyone arrives at
          once, they arrive asking who won, and a column of shut accordions is
          what stands between them and the answer (PRD §6.1.2). */}
      {winners.length > 0 && (
        <Section eyebrow="ຜົນລາງວັນ" title="ຜູ້ຊະນະທຸກສາຂາ">
          <div className="grid gap-3">
            {winners.slice(0, WINNER_ROWS).map((row) => (
              <WinnerTile key={row.category.id} row={row} />
            ))}
          </div>

          {/* A year with 40 categories would otherwise be one endless page
              (PRD §7.6). <details> does this with no client JavaScript, so
              the rows below the fold are still in the HTML for search. */}
          {winners.length > WINNER_ROWS && (
            <details className="group mt-3">
              <summary className="cursor-pointer list-none rounded-[var(--radius-box)] border border-rule bg-panel px-5 py-3 text-center text-[13px] font-semibold text-brand-deep hover:bg-brand-soft/50">
                <span className="group-open:hidden">
                  ເບິ່ງເພີ່ມອີກ {winners.length - WINNER_ROWS} ສາຂາ ↓
                </span>
                <span className="hidden group-open:inline">ຫຍໍ້ກັບ ↑</span>
              </summary>
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <div className="mt-3 grid gap-3">
                    {winners.slice(WINNER_ROWS).map((row) => (
                      <WinnerTile key={row.category.id} row={row} />
                    ))}
                  </div>
                </div>
              </div>
            </details>
          )}
        </Section>
      )}

      {/* 4 — categories, with nominees once the phase allows */}
      <Section
        eyebrow="ສາຂາ"
        title={showNominees ? 'ສາຂາ ແລະ ຜູ້ເຂົ້າຊີງ' : 'ສາຂາລາງວັນປີນີ້'}
        intro={
          showNominees
            ? undefined
            : 'ລາຍຊື່ຜູ້ເຂົ້າຊີງຈະປະກາດພາຍຫຼັງ — ຕິດຕາມທາງເພຈຂອງງານ'
        }
        className={winners.length > 0 ? 'bg-panel-2/50' : undefined}
      >
        {edition.categories.length === 0 ? (
          <p className="text-[14px] text-ink-3">
            <Placeholder>ຍັງບໍ່ໄດ້ໃສ່ສາຂາ — ເພີ່ມໄດ້ໃນຫຼັງບ້ານ</Placeholder>
          </p>
        ) : (
          groupedCategories.map(([group, categories]) => (
            <div key={group} className="mb-8 last:mb-0">
              {/* Only a year that fills groupLo in gets headings (PRD §7.6). */}
              {group && (
                <h3 className="mb-3 text-[11px] font-bold uppercase text-ink-3">
                  {group}
                </h3>
              )}
              <div className="space-y-4">
            {categories.map((category) => (
              <details
                key={category.id}
                name="edition-categories"
                open={category.isFeatured}
                className="group overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="font-serif text-base text-ink">{category.nameLo}</h3>
                    {category.descriptionLo && (
                      <p className="mt-0.5 font-sans-looped text-[13px] text-ink-2">{category.descriptionLo}</p>
                    )}
                  </div>
                  {category.nominees.length > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-3">
                      <span className="text-[12px] text-ink-3">
                        ຜູ້ເຂົ້າຊີງ {category.nominees.length} ຄົນ
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                    </span>
                  )}
                </summary>

                {category.nominees.length > 0 && (
                  // Animates open/close without client JS: the grid row
                  // tweens between 0fr and 1fr, and the row's own intrinsic
                  // height does the rest — <details> itself still controls
                  // open/close state, so keyboard support and the crawlable,
                  // no-JS fallback from PRD §7.6 are untouched.
                  //
                  // The id lives here, on a real (non-summary) child of the
                  // <details>, rather than on the <details> itself — a
                  // fragment link landing on the <details> element's own id
                  // would not need opening (its summary is always visible),
                  // but the browser's built-in "reveal hidden content" step
                  // does open a closed <details> to show a descendant this
                  // way, which is what the winner tiles above rely on.
                  <div
                    id={categoryAnchor(category.slug)}
                    className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr]"
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-hairline px-5 py-5">
                        {/* A phone gets a swipeable strip rather than a column
                            of full-width cards stacked one at a time — this
                            is where a category with a dozen nominees used to
                            turn into a long scroll. `-mx-5 px-5` bleeds the
                            strip to the section's own edge so the next card
                            peeks in, matching the reference (Grammy.com); a
                            plain no-JS scroll-snap row, so it costs nothing
                            over the old grid, which is what sm: and up still
                            is. */}
                        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 py-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-4">
                          {[...category.nominees]
                            // The winner leads the grid when there is one.
                            .sort((a, b) => Number(b.isWinner) - Number(a.isWinner))
                            .map((nominee) => (
                              <div
                                key={nominee.id}
                                className="w-[44%] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-none"
                              >
                                <CreatorCard
                                  creator={nominee.creator}
                                  isWinner={nominee.isWinner}
                                  href={`/creators/${nominee.creator.slug}`}
                                />
                              </div>
                            ))}
                        </div>
                        <Link
                          href={`/awards/${edition.slug}/${category.slug}`}
                          className="mt-4 inline-block text-[13px] text-brand-deep hover:underline"
                        >
                          ເບິ່ງທັງສາຂາ →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </details>
            ))}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* 5 — what happens on the night */}
      {activities.length > 0 && (
        <Section eyebrow="ພາຍໃນງານ" title="ກິດຈະກຳໃນງານ">
          <ol
            aria-label="ກິດຈະກຳໃນງານ"
            className="max-w-2xl overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel"
          >
            {activities.map((activity, index) => (
              <li
                key={activity}
                className="stagger-item flex items-center gap-4 border-b border-hairline px-5 py-4 last:border-b-0"
              >
                <span className="w-[34px] shrink-0 text-center font-serif text-[30px] font-bold leading-none text-brand-deep">
                  {index + 1}
                </span>
                <span className="w-px shrink-0 self-stretch bg-rule" aria-hidden />
                <span className="text-[19px] leading-snug text-ink">{activity}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 6 — the panel for this year */}
      {edition.judges.length > 0 && (
        <Section eyebrow="ຄະນະກຳມະການ" title="ຜູ້ຕັດສິນປີນີ້">
          {/* One row per judge on a phone, matching the winner tiles above.
              sm: and up switches to a photo-forward card — the same visual
              weight the nominee grid beside it gives each entry, rather than
              a small circular avatar adrift in a wide column. */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {edition.judges.map((judge) => (
              <Link
                key={judge.id}
                href={`/judges/${judge.slug}`}
                className="stagger-item flex items-center gap-3 rounded-[var(--radius-box)] border border-rule bg-panel p-3.5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-3 sm:block sm:overflow-hidden sm:border-0 sm:bg-panel sm:p-0 sm:shadow-[0_1px_2px_rgba(20,14,10,.05),0_1px_10px_rgba(20,14,10,.04)] sm:hover:shadow-[0_2px_4px_rgba(20,14,10,.08),0_4px_18px_rgba(20,14,10,.07)]"
              >
                <Avatar
                  creator={{ nameLo: judge.nameLo, avatarKey: judge.avatarKey }}
                  alt={judge.nameLo}
                  className="shrink-0 sm:hidden"
                />
                <div className="min-w-0 sm:hidden">
                  {judge.role === 'CHAIR' && (
                    <span className="mb-1 inline-block rounded-full border border-brand-edge bg-brand-soft px-2.5 py-0.5 text-[10.5px] font-bold text-brand-deep">
                      ປະທານ
                    </span>
                  )}
                  <p className="truncate font-serif text-[19px] leading-tight text-ink">
                    <LaoText text={judge.nameLo} />
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">{judge.positionLo}</p>
                </div>

                <div className="hidden sm:block">
                  <div className="relative aspect-square overflow-hidden bg-panel-2">
                    <SiteImage
                      imageKey={judge.avatarKey}
                      alt={judge.nameLo}
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                    {judge.role === 'CHAIR' && (
                      <span className="absolute bottom-2.5 left-2.5 rounded-full bg-brand-deep px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_1px_4px_rgba(0,0,0,.25)]">
                        ປະທານ
                      </span>
                    )}
                  </div>
                  <div className="px-3.5 pb-4 pt-3.5 text-center">
                    <p className="truncate font-serif text-[15px] leading-tight text-ink">
                      <LaoText text={judge.nameLo} />
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{judge.positionLo}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 7 — sponsors, grouped by tier */}
      {edition.sponsors.length > 0 && (
        <Section eyebrow="ຜູ້ສະໜັບສະໜູນ" title="ຂອບໃຈຜູ້ສະໜັບສະໜູນປີນີ້" className="bg-panel-2/50">
          {/* Grouped by the group's id and headed with the name the team gave it —
              the API returns the logos in group order, then in order inside the
              group, and Object.entries keeps that. */}
          {Object.entries(
            edition.sponsors.reduce<Record<string, typeof edition.sponsors>>((groups, sponsor) => {
              (groups[sponsor.tierId] ??= []).push(sponsor);
              return groups;
            }, {}),
          ).map(([tierId, sponsors]) => {
            const logoFrame = LOGO_SIZE[sponsors[0].tierLogoSize];
            return (
              <div key={tierId} className="mb-8 last:mb-0">
                <p className="mb-3 text-[10.5px] font-bold uppercase text-ink-3">
                  {sponsors[0].tierNameLo}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {sponsors.map((sponsor) => {
                    const inner = sponsor.logoKey ? (
                      <SiteImageFixed
                        imageKey={sponsor.logoKey}
                        alt={sponsor.name}
                        width={160}
                        height={120}
                        className={cn(logoFrame, 'object-contain')}
                      />
                    ) : (
                      <span className="text-[13px] text-ink-2">{sponsor.name}</span>
                    );
                    return (
                      <div
                        key={sponsor.id}
                        className="inline-grid place-items-center rounded-[var(--radius-sm)] border border-rule bg-white p-2"
                      >
                        {safeHttpUrl(sponsor.websiteUrl) ? (
                          <a href={safeHttpUrl(sponsor.websiteUrl) as string} target="_blank" rel="noreferrer">
                            {inner}
                          </a>
                        ) : (
                          inner
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* 8 — the gallery, once the night is over */}
      {gallery.length > 0 && (
        <Section eyebrow="ບັນຍາກາດ" title={`ພາບບັນຍາກາດງານ ${edition.year}`}>
          <Gallery imageKeys={gallery} alt={`ບັນຍາກາດ ${edition.titleLo}`} />
        </Section>
      )}
    </>
  );
}
