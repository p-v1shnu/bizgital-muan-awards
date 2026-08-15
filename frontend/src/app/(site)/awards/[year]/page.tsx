import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, Eye, MapPin } from 'lucide-react';

import { ActionLink, Avatar, CreatorCard, Placeholder, Section } from '@/components/site/primitives';
import { cn, safeHttpUrl } from '@/lib/utils';
import { SiteImage, SiteImageFixed } from '@/components/site/site-image';
import { getPublic, getPublicOrNotFound } from '@/lib/api/server';
import { imageKeyList, imageUrl } from '@/lib/images';
import type { Edition, SponsorTier } from '@/types/api';
import type { PublicEdition } from '@/types/public';
import { formatDate } from '@/lib/dates';

interface PageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const edition = await getPublic<PublicEdition>(`/editions/${year}`);
  if (!edition) return { title: 'ບໍ່ພົບປີນີ້' };

  return {
    title: edition.titleLo,
    description: edition.descriptionLo ?? undefined,
    openGraph: {
      title: edition.titleLo,
      description: edition.descriptionLo ?? undefined,
      images: imageUrl(edition.heroImageKey) ? [imageUrl(edition.heroImageKey) as string] : undefined,
    },
  };
}

/** How many winner rows show before the rest fold away (PRD §7.6). */
const WINNER_ROWS = 12;

const TIER_LABEL: Record<SponsorTier, string> = {
  TITLE: 'ຜູ້ສະໜັບສະໜູນຫຼັກ',
  GOLD: 'ລະດັບຄຳ',
  SILVER: 'ລະດັບເງິນ',
  SUPPORTER: 'ຜູ້ສະໜັບສະໜູນ',
  PARTNER: 'ພາດເນີ',
  MEDIA: 'ສື່ມວນຊົນ',
};

interface WinnerRowData {
  category: { id: string; slug: string; nameLo: string };
  winner: { creator: { slug: string; nameLo: string; avatarKey: string | null } };
}

function WinnerRow({ row, editionSlug }: { row: WinnerRowData; editionSlug: string }) {
  const { category, winner } = row;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-4 last:border-b-0">
      <span className="w-full text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3 sm:w-56">
        {category.nameLo}
      </span>
      <Link
        href={`/creators/${winner.creator.slug}`}
        className="flex items-center gap-3 font-serif text-xl text-ink hover:underline"
      >
        <Avatar creator={winner.creator} size="md" />
        {winner.creator.nameLo}
      </Link>
      <Link
        href={`/awards/${editionSlug}/${category.slug}`}
        className="ml-auto text-[13px] text-brand-deep hover:underline"
      >
        ເບິ່ງນອມິນີ →
      </Link>
    </div>
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
    getPublicOrNotFound<PublicEdition>(`/editions/${year}`, { preview }),
    getPublic<Edition[]>('/editions'),
  ]);

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
      {edition.preview && (
        <div className="bg-ink px-5 py-2.5 text-center text-[12.5px] text-[#f0e9df]">
          <Eye className="mr-2 inline size-4" />
          ນີ້ແມ່ນ<b className="mx-1">ພຣີວິວ</b>— ປີນີ້ຍັງບໍ່ໄດ້ເຜີຍແຜ່ ຄົນທົ່ວໄປຍັງເຫັນບໍ່ໄດ້
        </div>
      )}

      {/* 1 — hero: the only place a year is allowed its own look */}
      <section className="relative overflow-hidden bg-panel-2">
        <div className="relative h-[46vh] min-h-[320px]">
          <SiteImage imageKey={edition.heroImageKey} sizes="100vw" priority />
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
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {edition.phase === 'PUBLISHED' && (
                <ActionLink href="/submit" className="px-4 py-2.5 text-[13px]">
                  ສົ່ງລາຍຊື່
                </ActionLink>
              )}
              {safeHttpUrl(edition.ticketUrl) && (
                <ActionLink href={safeHttpUrl(edition.ticketUrl) as string} tone="quiet" external className="px-4 py-2.5 text-[13px]">
                  ຊື້ບັດ
                </ActionLink>
              )}
              {safeHttpUrl(edition.voteUrl) && (
                <ActionLink href={safeHttpUrl(edition.voteUrl) as string} tone="quiet" external className="px-4 py-2.5 text-[13px]">
                  ໂຫວດ
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
        <Section className="py-10">
          <p className="max-w-2xl text-[15px] leading-[1.85] text-ink-2">{edition.descriptionLo}</p>
        </Section>
      )}

      {/* 4 — the results table, once there are results */}
      {winners.length > 0 && (
        <Section eyebrow="ຜົນລາງວັນ" title="ຜູ້ຊະນະທຸກສາຂາ">
          <div className="overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel">
            {winners.slice(0, WINNER_ROWS).map((row) => (
              <WinnerRow key={row.category.id} row={row} editionSlug={edition.slug} />
            ))}

            {/* A year with 40 categories would otherwise be one endless page
                (PRD §7.6). <details> does this with no client JavaScript, so
                the rows below the fold are still in the HTML for search. */}
            {winners.length > WINNER_ROWS && (
              <details className="group">
                <summary className="cursor-pointer list-none border-t border-hairline px-5 py-3.5 text-center text-[13px] font-semibold text-brand-deep hover:bg-brand-soft/50">
                  <span className="group-open:hidden">
                    ເບິ່ງເພີ່ມອີກ {winners.length - WINNER_ROWS} ສາຂາ ↓
                  </span>
                  <span className="hidden group-open:inline">ຫຍໍ້ກັບ ↑</span>
                </summary>
                {winners.slice(WINNER_ROWS).map((row) => (
                  <WinnerRow key={row.category.id} row={row} editionSlug={edition.slug} />
                ))}
              </details>
            )}
          </div>
        </Section>
      )}

      {/* 3 — categories, with nominees once the phase allows */}
      <Section
        eyebrow="ສາຂາ"
        title={showNominees ? 'ສາຂາ ແລະ ນອມິນີ' : 'ສາຂາລາງວັນປີນີ້'}
        intro={
          showNominees
            ? undefined
            : 'ລາຍຊື່ຜູ້ເຂົ້າຊິງຈະປະກາດພາຍຫຼັງ — ຕິດຕາມທາງເພຈຂອງງານ'
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
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
                  {group}
                </h3>
              )}
              <div className="space-y-4">
            {categories.map((category) => (
              <details
                key={category.id}
                open={category.isFeatured}
                className="group overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl text-ink">{category.nameLo}</h3>
                    {category.descriptionLo && (
                      <p className="mt-0.5 text-[13px] text-ink-2">{category.descriptionLo}</p>
                    )}
                  </div>
                  {category.isFeatured && (
                    <span className="rounded-full border border-brand-edge bg-brand-soft px-2.5 py-0.5 text-[10.5px] font-bold text-brand-deep">
                      ສາຂາເດັ່ນ
                    </span>
                  )}
                  {category.nominees.length > 0 && (
                    <span className="ml-auto shrink-0 text-[12px] text-ink-3">
                      {category.nominees.length} ນອມິນີ
                    </span>
                  )}
                </summary>

                {category.nominees.length > 0 && (
                  <div className="border-t border-hairline px-5 py-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[...category.nominees]
                        // The winner leads the grid when there is one.
                        .sort((a, b) => Number(b.isWinner) - Number(a.isWinner))
                        .map((nominee) => (
                          <CreatorCard
                            key={nominee.id}
                            creator={nominee.creator}
                            isWinner={nominee.isWinner}
                            href={`/creators/${nominee.creator.slug}`}
                          />
                        ))}
                    </div>
                    <Link
                      href={`/awards/${edition.slug}/${category.slug}`}
                      className="mt-4 inline-block text-[13px] text-brand-deep hover:underline"
                    >
                      ເບິ່ງທັງສາຂາ →
                    </Link>
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
                className="flex items-start gap-4 border-b border-hairline px-5 py-4 last:border-b-0"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-brand-edge bg-brand-soft text-[12px] font-bold text-brand-deep">
                  {index + 1}
                </span>
                <span className="font-serif text-[19px] leading-snug text-ink">{activity}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 6 — the panel for this year */}
      {edition.judges.length > 0 && (
        <Section eyebrow="ຄະນະກຳມະການ" title="ຜູ້ຕັດສິນປີນີ້">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {edition.judges.map((judge) => (
              <div
                key={judge.id}
                className="rounded-[var(--radius-box)] border border-rule bg-panel p-5 text-center"
              >
                <div className="flex justify-center">
                  <Avatar creator={{ nameLo: judge.nameLo, avatarKey: judge.avatarKey }} />
                </div>
                {judge.role === 'CHAIR' && (
                  <span className="mt-3 inline-block rounded-full border border-brand-edge bg-brand-soft px-2.5 py-0.5 text-[10.5px] font-bold text-brand-deep">
                    ປະທານ
                  </span>
                )}
                <p className="mt-2 font-serif text-[19px] leading-tight text-ink">{judge.nameLo}</p>
                <p className="mt-1 text-[12.5px] text-ink-3">{judge.positionLo}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7 — sponsors, grouped by tier */}
      {edition.sponsors.length > 0 && (
        <Section eyebrow="ຜູ້ສະໜັບສະໜູນ" title="ຂອບໃຈຜູ້ສະໜັບສະໜູນປີນີ້" className="bg-panel-2/50">
          {Object.entries(
            edition.sponsors.reduce<Record<string, typeof edition.sponsors>>((groups, sponsor) => {
              (groups[sponsor.tier] ??= []).push(sponsor);
              return groups;
            }, {}),
          ).map(([tier, sponsors]) => (
            <div key={tier} className="mb-8 last:mb-0">
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-3">
                {TIER_LABEL[tier as SponsorTier]}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {sponsors.map((sponsor) => {
                  const inner = sponsor.logoKey ? (
                    <SiteImageFixed
                      imageKey={sponsor.logoKey}
                      alt={sponsor.name}
                      width={160}
                      height={40}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-[13px] text-ink-2">{sponsor.name}</span>
                  );
                  return (
                    <div
                      key={sponsor.id}
                      className="grid h-20 min-w-40 place-items-center rounded-[var(--radius-sm)] border border-rule bg-panel px-5"
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
          ))}
        </Section>
      )}

      {/* 8 — the gallery, once the night is over */}
      {gallery.length > 0 && (
        <Section eyebrow="ບັນຍາກາດ" title={`ພາບບັນຍາກາດງານ ${edition.year}`}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {gallery.map((key) => (
              <div key={key} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-panel-2">
                <SiteImage imageKey={key} sizes="(max-width: 768px) 50vw, 380px" />
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
