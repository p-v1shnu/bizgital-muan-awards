import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Gavel, Megaphone, Trophy } from 'lucide-react';

import { ActionLink, Placeholder, Section } from '@/components/site/primitives';
import { SiteImage } from '@/components/site/site-image';
import { JsonLd, organisationJsonLd } from '@/lib/structured-data';
import { getPublic } from '@/lib/api/server';
import { pageSeo } from '@/lib/page-seo';
import { safeHttpUrl } from '@/lib/utils';
import { imageKeyList } from '@/lib/images';
import type { Edition, HomeCards, SiteSettings } from '@/types/api';

/** One address per page, so /awards/latest cannot read as a rival copy. */
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await pageSeo('home', {
    title: 'ມ່ວນອາວອດສ໌ · Muan Awards',
    description: 'ລາງວັນປະຈຳປີສຳລັບຄຣີເອເຕີ ແລະ ຜູ້ສ້າງສັນເນື້ອຫາ',
  });
  // Absolute: the root layout appends "· ມ່ວນອາວອດສ໌" to every other page's
  // title, and the homepage's already is the site's name.
  return { alternates: { canonical: '/' }, title: { absolute: title }, description };
}

interface WinnersYear {
  id: string;
  year: number;
  slug: string;
  titleLo: string;
  heroImageKey: string | null;
  categories: {
    id: string;
    slug: string;
    nameLo: string;
    isFeatured: boolean;
    winner: { slug: string; nameLo: string; nameEn: string | null; avatarKey: string | null };
  }[];
}

/**
 * The brand hub. Every section here has to survive the 18-month test: if
 * nobody touched the site for a year and a half, would it still be correct?
 * That is why sponsors, judges and this year's category list are absent —
 * they belong to a year, and they live on the year page (PRD §6.1.1).
 */
/**
 * The icon each judging step is drawn with, by position. The steps themselves
 * are the team's and live in /admin/site; these belong to the page, so a list
 * the team makes longer simply runs past the end of them.
 */
const STEP_ICONS = [ClipboardList, Megaphone, Gavel, Trophy];

export default async function HomePage() {
  const [site, current, winnerYears, editions, stats, openEdition] = await Promise.all([
    getPublic<SiteSettings>('/site'),
    getPublic<Edition | null>('/editions/latest'),
    getPublic<WinnersYear[]>('/winners'),
    getPublic<Edition[]>('/editions'),
    getPublic<{ years: number; categories: number; creators: number }>('/stats'),
    // Whether entries are open is the API's decision, not a column: it is the
    // switch *and* the closing time, and asking the endpoint that already knows
    // beats re-deriving it here (PRD §4.2).
    getPublic<Edition | null>('/editions/accepting-submissions'),
  ]);

  const heroKey = site?.heroImageKey ?? null;
  // The same list /about renders, in the order the team put it in.
  const judgingSteps = site?.judgingSteps ?? [];
  // Card copy the team writes in /admin/site; every read below falls back to the
  // wording the page used to hold, so a blank field never blanks a card.
  const cards = site?.homeCards ?? {};
  const gallery = imageKeyList(site?.galleryImageKeys);
  const latestWinners = winnerYears?.[0];
  const featuredWinners = (latestWinners?.categories ?? [])
    .filter((category) => category.isFeatured)
    .slice(0, 4);

  return (
    <>
      <JsonLd data={organisationJsonLd()} />

      {/* 2 — hero, with the two entry cards overlapping its lower edge */}
      <section className="relative">
        <div className="relative h-[58vh] min-h-[380px] w-full overflow-hidden bg-panel-2">
          {heroKey ? (
            // The one image above the fold, so it is what LCP measures.
            <SiteImage
              imageKey={heroKey}
              alt={site?.heroCaptionLo ?? 'ງານມອບລາງວັນ ມ່ວນອາວອດສ໌'}
              sizes="100vw"
              priority
            />
          ) : (
            <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#f4efe5,#e9e0d0)]">
              <p className="px-6 text-center text-[13px] text-ink-3">
                <Placeholder>ຮູບ hero — ອັບໂຫລດຜ່ານ /admin/site</Placeholder>
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-6xl px-5 pb-28 md:pb-32">
              <h1 className="max-w-2xl font-serif text-4xl leading-[1.1] text-white md:text-6xl">
                {site?.heroTitleLo || 'ມ່ວນອາວອດສ໌'}
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 md:text-base">
                {site?.brandStatementLo || (
                  <Placeholder>ຂໍ້ຄວາມແບຣນ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
                )}
              </p>
              {/* docs/design/home.html puts one action in the hero — the way in
                  to this year — and the build had left it out, so the only route
                  to the year page was a secondary button inside the card below.
                  `quiet` is the light chip: on a photograph the cream button is
                  the prominent one, and ink on ink would not be. */}
              {current && (
                <div className="mt-6">
                  <ActionLink href={`/awards/${current.slug}`} tone="quiet">
                    ເບິ່ງງານປີ {current.year}
                  </ActionLink>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*
          The cards straddle the hero's lower edge. They need their own
          stacking position: the hero's gradient is absolutely positioned, and
          a positioned element paints above a later unpositioned sibling no
          matter what the DOM order says.
        */}
        <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-5">
          <div className="grid gap-4 md:grid-cols-2">
            <CurrentEditionCard
              edition={current}
              accepting={Boolean(current && openEdition && openEdition.id === current.id)}
              cards={cards}
            />
            <Link
              href="/winners"
              className="flex flex-col justify-between rounded-[var(--radius-box)] border border-rule bg-panel p-6 transition-colors hover:border-ink-3"
            >
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-3">
                  ຕະຫຼອດທຸກປີ
                </p>
                <p className="mt-2 font-serif text-2xl text-ink">ທຳນຽບຜູ້ຊະນະ</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                  {cards.hallOfWinners?.bodyLo || 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ນັບແຕ່ປີທຳອິດ'}
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-deep">
                ເປີດເບິ່ງ →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3 — what this is */}
      <Section>
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-3">
              ກ່ຽວກັບງານ
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-ink md:text-4xl">
              {site?.aboutTitleLo || 'ມ່ວນອາວອດສ໌ ຄືຫຍັງ'}
            </h2>
            <hr className="foil mb-[18px] mt-4 h-[3px] w-[170px] rounded-sm border-0" />
            <p className="text-[15px] leading-[1.85] text-ink-2">
              {site?.aboutSummaryLo || (
                <Placeholder>ຫຍໍ້ໜ້າແນະນຳງານ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
              )}
            </p>
            <div className="mt-6">
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 border-b-[1.5px] border-brand pb-px text-[13.5px] font-semibold text-ink hover:text-brand-deep"
              >
                ອ່ານເພີ່ມ
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(gallery.length > 0 ? gallery.slice(0, 6) : Array.from({ length: 6 })).map(
              (item, index) => (
                <div
                  key={index}
                  className={`group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-rule bg-panel-2 ${
                    index === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  {typeof item === 'string' ? (
                    <SiteImage
                      imageKey={item}
                      alt="ບັນຍາກາດງານ ມ່ວນອາວອດສ໌"
                      sizes="(max-width: 768px) 33vw, 200px"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="size-full border border-dashed border-rule" />
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      </Section>

      {/* 4 — the latest winners, which swap themselves when a new year announces */}
      {featuredWinners.length > 0 && latestWinners && (
        <>
          <div className="weave h-3 border-y border-rule bg-panel-2" aria-hidden />
          <Section
            eyebrow={`ຜູ້ຊະນະປີ ${latestWinners.year}`}
            title="ໄຮໄລທ໌ຜູ້ຊະນະລ່າສຸດ"
            className="bg-panel-2/50"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredWinners.map((category) => (
                <Link
                  key={category.id}
                  href={`/creators/${category.winner.slug}`}
                  className="group block overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-panel-2">
                    <SiteImage
                      imageKey={category.winner.avatarKey}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-3.5 pb-4 pt-3.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                      {category.nameLo}
                    </p>
                    <p className="mt-1 font-serif text-lg leading-tight text-ink">
                      {category.winner.nameLo}
                    </p>
                    {category.winner.nameEn && (
                      <p className="mt-0.5 text-[11.5px] text-ink-3">{category.winner.nameEn}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <ActionLink href={`/awards/${latestWinners.slug}`} tone="quiet">
                ເບິ່ງຜົນທັງໝົດປີ {latestWinners.year}
              </ActionLink>
            </div>
          </Section>
        </>
      )}

      {/* 5 — running totals, counted from the data */}
      {stats && (
        <section className="bg-ink py-11">
          <dl className="mx-auto grid max-w-6xl grid-cols-3 gap-7 px-5">
            <Stat value={stats.years} label="ປີທີ່ຈັດງານ" />
            <Stat value={stats.categories} label="ສາຂາລາງວັນ" />
            <Stat value={stats.creators} label="ຄຣີເອເຕີທີ່ເຂົ້າຊີງ" />
          </dl>
        </section>
      )}

      {/* 6 — how it is judged, which stands in for a per-year judge list. The
          steps come from /admin/site, and /about renders the same list: the two
          pages used to hold a copy each and had already drifted apart. */}
      <Section eyebrow="ຄວາມໂປ່ງໃສ" title="ລາງວັນນີ້ຕັດສິນແນວໃດ">
        {judgingSteps.length > 0 ? (
          <ol className="grid gap-4 md:grid-cols-4">
            {judgingSteps.map((step, index) => {
              // The icons are the page's, not the team's — a step past the
              // fourth is numbered and framed the same, just without one.
              const Icon = STEP_ICONS[index];
              return (
                <li
                  key={`${index}-${step.titleLo}`}
                  className="rounded-[var(--radius-box)] border border-rule bg-panel p-5"
                >
                  {Icon && (
                    <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-brand-soft text-brand-deep">
                      <Icon className="size-4.5" />
                    </span>
                  )}
                  <p className="mt-3 font-serif text-lg text-ink">
                    <span className="mr-1.5 text-ink-3">{index + 1}.</span>
                    {step.titleLo}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{step.bodyLo}</p>
                </li>
              );
            })}
          </ol>
        ) : (
          <Placeholder>ຂັ້ນຕອນການຕັດສິນ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
        )}
      </Section>

      {/* 7 — the timeline, which grows on its own every year */}
      {editions && editions.length > 0 && (
        <Section eyebrow="ຍ້ອນເບິ່ງ" title="ປີທີ່ຜ່ານມາ" className="bg-panel-2/50">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {editions.map((edition) => (
              <Link
                key={edition.id}
                href={`/awards/${edition.slug}`}
                className="group overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel transition-colors hover:border-ink-3"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-panel-2">
                  <SiteImage
                    imageKey={edition.heroImageKey}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    className="transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="flex items-baseline gap-3 p-4">
                  <span className="font-serif text-2xl text-ink">{edition.year}</span>
                  <span className="truncate text-[13px] text-ink-2">{edition.titleLo}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 8 — the gallery the team curates by hand */}
      {gallery.length > 0 && (
        <Section eyebrow="ບັນຍາກາດ" title="ຄັງພາບ">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {gallery.slice(0, 6).map((key) => (
              <div
                key={key}
                className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] border border-rule bg-panel-2"
              >
                <SiteImage
                  imageKey={key}
                  alt="ບັນຍາກາດງານ ມ່ວນອາວອດສ໌"
                  sizes="(max-width: 768px) 50vw, 380px"
                  className="transition-transform duration-500 group-hover:scale-[1.07]"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-hidden
                />
              </div>
            ))}
          </div>

          {/* Photos of a night belong to the year they were taken in, so the
              way through to the rest is that year's page, not a page here. */}
          {latestWinners && (
            <Link
              href={`/awards/${latestWinners.slug}`}
              className="mt-4 inline-block text-[13.5px] font-semibold text-brand-deep hover:underline"
            >
              ເບິ່ງພາບບັນຍາກາດງານ {latestWinners.year} ທັງໝົດ →
            </Link>
          )}
        </Section>
      )}

      {/* 9 — closing call to action */}
      <section className="border-y border-rule bg-panel px-5 py-14 text-center md:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-[clamp(26px,3.6vw,38px)] text-ink">
            {site?.ctaTitleLo || 'ຢາກສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກບໍ່?'}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
            {site?.ctaBodyLo || 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກເຂົ້າມາໄດ້ເລີຍ'}
          </p>
          <div className="mt-6 flex justify-center">
            <ActionLink href="/submit">ສົ່ງລາຍຊື່</ActionLink>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-l border-white/15 pl-4 md:pl-5">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-serif text-[clamp(32px,5vw,56px)] leading-none text-white tabular-nums">
          {value}
        </span>
        <span className="mt-2 block text-[13px] text-white/60">{label}</span>
      </dd>
    </div>
  );
}

/**
 * The one place on the homepage that speaks about the current year. Its
 * heading and call to action follow the phase, so the card is right whether
 * entries are open, nominees are out, or the results are in.
 */
function CurrentEditionCard({
  edition,
  accepting,
  cards,
}: {
  edition: Edition | null;
  accepting: boolean;
  cards: HomeCards;
}) {
  if (!edition) {
    return (
      <div className="rounded-[var(--radius-box)] border border-rule bg-panel p-6">
        <p className="font-serif text-2xl text-ink">{cards.noYear?.titleLo || 'ງານປີຕໍ່ໄປ'}</p>
        <p className="mt-2 text-[13.5px] text-ink-2">
          {cards.noYear?.bodyLo || 'ຈະປະກາດໃນໄວໆນີ້'}
        </p>
      </div>
    );
  }

  // The eyebrow stays in the page: it is a label on a state, not a sentence
  // about the awards, and the year beside it is the data talking.
  const copy = {
    PUBLISHED: {
      eyebrow: 'ງານປີນີ້',
      title: cards.published?.titleLo || 'ເປີດແລ້ວ',
      body: cards.published?.bodyLo || 'ເບິ່ງສາຂາ ແລະ ລາຍລະອຽດຂອງງານປີນີ້',
    },
    NOMINEES_ANNOUNCED: {
      eyebrow: 'ງານປີນີ້',
      title: cards.nominees?.titleLo || 'ປະກາດຜູ້ເຂົ້າຊີງແລ້ວ',
      body: cards.nominees?.bodyLo || 'ເບິ່ງລາຍຊື່ຜູ້ເຂົ້າຊີງທຸກສາຂາ',
    },
    WINNERS_ANNOUNCED: {
      eyebrow: 'ງານປີນີ້',
      title: cards.winners?.titleLo || 'ປະກາດຜົນແລ້ວ',
      body: cards.winners?.bodyLo || 'ເບິ່ງຜູ້ຊະນະທຸກສາຂາຂອງປີນີ້',
    },
    DRAFT: {
      eyebrow: 'ງານປີນີ້',
      title: cards.draft?.titleLo || 'ກຳລັງຕຽມການ',
      body: cards.draft?.bodyLo ?? '',
    },
  }[edition.phase];

  /**
   * The card is the only place the current year appears on the homepage
   * (PRD §6.1.1 §2), so it is also the only place that can say entries are
   * open — and it was reading the phase alone, which cannot know. While the
   * form is open that outranks whatever the phase would have said: sending in
   * a name is the thing with a deadline.
   */
  const open = accepting
    ? {
        eyebrow: 'ງານປີນີ້',
        title: cards.entriesOpen?.titleLo || 'ເປີດຮັບສະເໜີຊື່ແລ້ວ',
        body: cards.entriesOpen?.bodyLo || 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ',
      }
    : null;
  const shown = open ?? copy;

  return (
    <div className="flex flex-col justify-between rounded-[var(--radius-box)] border border-brand-edge bg-panel p-6">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-brand-deep">
          {shown.eyebrow} · {edition.year}
        </p>
        <p className="mt-2 font-serif text-2xl text-ink">{shown.title}</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{shown.body}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/* While the form is open the card carries only the thing with a
            deadline: the hero above already links to the year page, and the
            same button twice on one screen reads as two different places. */}
        {accepting ? (
          <ActionLink href="/submit" className="px-4 py-2.5 text-[13px]">
            ສົ່ງລາຍຊື່
          </ActionLink>
        ) : (
          <ActionLink href={`/awards/${edition.slug}`} className="px-4 py-2.5 text-[13px]">
            ເບິ່ງງານປີ {edition.year}
          </ActionLink>
        )}
        {/* Ticketing and voting are run elsewhere, so these are secondary and
            marked as leaving the site (PRD §7.4). */}
        {safeHttpUrl(edition.ticketUrl) && (
          <ActionLink
            href={safeHttpUrl(edition.ticketUrl) as string}
            tone="quiet"
            external
            className="px-4 py-2.5 text-[13px]"
          >
            ຊື້ບັດ
          </ActionLink>
        )}
        {safeHttpUrl(edition.voteUrl) && (
          <ActionLink
            href={safeHttpUrl(edition.voteUrl) as string}
            tone="quiet"
            external
            className="px-4 py-2.5 text-[13px]"
          >
            ໂຫວດ
          </ActionLink>
        )}
      </div>
    </div>
  );
}
