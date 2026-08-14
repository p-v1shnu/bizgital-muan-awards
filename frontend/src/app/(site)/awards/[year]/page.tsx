import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, Eye, MapPin } from 'lucide-react';

import { ActionLink, Avatar, CreatorCard, Placeholder, Section } from '@/components/site/primitives';
import { cn } from '@/lib/utils';
import { getPublic, getPublicOrNotFound } from '@/lib/api/server';
import { imageUrl, imageUrlList } from '@/lib/images';
import type { Edition, SponsorTier } from '@/types/api';
import type { PublicEdition } from '@/types/public';

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

const TIER_LABEL: Record<SponsorTier, string> = {
  TITLE: 'ຜູ້ສະໜັບສະໜູນຫຼັກ',
  GOLD: 'ລະດັບຄຳ',
  SILVER: 'ລະດັບເງິນ',
  SUPPORTER: 'ຜູ້ສະໜັບສະໜູນ',
  PARTNER: 'ພາດເນີ',
  MEDIA: 'ສື່ມວນຊົນ',
};

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

  const hero = imageUrl(edition.heroImageKey);
  const gallery = imageUrlList(edition.galleryImageKeys);
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
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-[linear-gradient(150deg,#f4efe5,#e4d8c4)]" />
          )}
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
                  {new Date(edition.eventDate).toLocaleDateString('lo-LA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
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
              {edition.ticketUrl && (
                <ActionLink href={edition.ticketUrl} tone="quiet" external className="px-4 py-2.5 text-[13px]">
                  ຊື້ບັດ
                </ActionLink>
              )}
              {edition.voteUrl && (
                <ActionLink href={edition.voteUrl} tone="quiet" external className="px-4 py-2.5 text-[13px]">
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
            {winners.map(({ category, winner }) => (
              <div
                key={category.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-4 last:border-b-0"
              >
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
                  href={`/awards/${edition.slug}/${category.slug}`}
                  className="ml-auto text-[13px] text-brand-deep hover:underline"
                >
                  ເບິ່ງນອມິນີ →
                </Link>
              </div>
            ))}
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
          <div className="space-y-4">
            {edition.categories.map((category) => (
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
        )}
      </Section>

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
                  const logo = imageUrl(sponsor.logoKey);
                  const inner = logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={sponsor.name} className="h-10 w-auto object-contain" />
                  ) : (
                    <span className="text-[13px] text-ink-2">{sponsor.name}</span>
                  );
                  return (
                    <div
                      key={sponsor.id}
                      className="grid h-20 min-w-40 place-items-center rounded-[var(--radius-sm)] border border-rule bg-panel px-5"
                    >
                      {sponsor.websiteUrl ? (
                        <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer">
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
            {gallery.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="aspect-[4/3] w-full rounded-[var(--radius-sm)] object-cover"
              />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
