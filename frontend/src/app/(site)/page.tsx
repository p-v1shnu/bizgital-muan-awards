import Link from 'next/link';
import { ClipboardList, Gavel, Megaphone, Trophy } from 'lucide-react';

import { ActionLink, CreatorCard, Placeholder, Section } from '@/components/site/primitives';
import { SiteImage } from '@/components/site/site-image';
import { getPublic } from '@/lib/api/server';
import { imageKeyList } from '@/lib/images';
import type { Edition, SiteSettings } from '@/types/api';

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
export default async function HomePage() {
  const [site, current, winnerYears, editions, stats] = await Promise.all([
    getPublic<SiteSettings>('/site'),
    getPublic<Edition | null>('/editions/latest'),
    getPublic<WinnersYear[]>('/winners'),
    getPublic<Edition[]>('/editions'),
    getPublic<{ years: number; categories: number; creators: number }>('/stats'),
  ]);

  const heroKey = site?.heroImageKey ?? null;
  const gallery = imageKeyList(site?.galleryImageKeys);
  const latestWinners = winnerYears?.[0];
  const featuredWinners = (latestWinners?.categories ?? [])
    .filter((category) => category.isFeatured)
    .slice(0, 4);

  return (
    <>
      {/* 2 — hero, with the two entry cards overlapping its lower edge */}
      <section className="relative">
        <div className="relative h-[58vh] min-h-[380px] w-full overflow-hidden bg-panel-2">
          {heroKey ? (
            // The one image above the fold, so it is what LCP measures.
            <SiteImage imageKey={heroKey} sizes="100vw" priority />
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
              <div className="foil mb-5 h-[3px] w-20 rounded-sm" aria-hidden />
              <h1 className="max-w-2xl font-serif text-4xl leading-[1.1] text-white md:text-6xl">
                ມ່ວນ ອະວອດ
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 md:text-base">
                {site?.brandStatementLo || (
                  <Placeholder>ຂໍ້ຄວາມແບຣນ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
                )}
              </p>
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
            <CurrentEditionCard edition={current} />
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
                  ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ນັບແຕ່ປີທຳອິດ
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
      <Section eyebrow="ກ່ຽວກັບງານ" title="ມ່ວນ ອະວອດ ຄືຫຍັງ">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-[15px] leading-[1.85] text-ink-2">
              {site?.aboutSummaryLo || (
                <Placeholder>ຫຍໍ້ໜ້າແນະນຳງານ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
              )}
            </p>
            <div className="mt-6">
              <ActionLink href="/about" tone="quiet">
                ອ່ານເພີ່ມ
              </ActionLink>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(gallery.length > 0 ? gallery.slice(0, 6) : Array.from({ length: 6 })).map(
              (item, index) => (
                <div
                  key={index}
                  className={`relative aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-panel-2 ${
                    index === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  {typeof item === 'string' ? (
                    <SiteImage imageKey={item} sizes="(max-width: 768px) 33vw, 200px" />
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
        <Section
          eyebrow={`ຜູ້ຊະນະປີ ${latestWinners.year}`}
          title="ໄຮໄລທ໌ຜູ້ຊະນະລ່າສຸດ"
          className="bg-panel-2/50"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredWinners.map((category) => (
              <div key={category.id}>
                <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">
                  {category.nameLo}
                </p>
                <CreatorCard
                  creator={category.winner}
                  isWinner
                  href={`/creators/${category.winner.slug}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-8">
            <ActionLink href={`/awards/${latestWinners.slug}`} tone="quiet">
              ເບິ່ງຜົນທັງໝົດປີ {latestWinners.year}
            </ActionLink>
          </div>
        </Section>
      )}

      {/* 5 — running totals, counted from the data */}
      {stats && (
        <Section className="py-10 md:py-12">
          <dl className="grid grid-cols-3 divide-x divide-rule rounded-[var(--radius-box)] border border-rule bg-panel">
            <Stat value={stats.years} label="ປີການປະກວດ" />
            <Stat value={stats.categories} label="ສາຂາລາງວັນ" />
            <Stat value={stats.creators} label="ຜູ້ສ້າງສັນທີ່ເຂົ້າຊິງ" />
          </dl>
        </Section>
      )}

      {/* 6 — how it is judged, which stands in for a per-year judge list */}
      <Section eyebrow="ຄວາມໂປ່ງໃສ" title="ລາງວັນນີ້ຕັດສິນແນວໃດ">
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            { icon: ClipboardList, title: 'ເສີນຊື່', body: 'ເປີດໃຫ້ທຸກຄົນສົ່ງຊື່ຜູ້ສ້າງສັນທີ່ຄູ່ຄວນ' },
            { icon: Megaphone, title: 'ຄັດກອງ', body: 'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີ' },
            { icon: Gavel, title: 'ກຳມະການລົງຄະແນນ', body: 'ຄະນະກຳມະການຂອງປີນັ້ນລົງຄະແນນເປັນເອກະລາດ' },
            { icon: Trophy, title: 'ປະກາດຜົນ', body: 'ປະກາດນອມິນີ ແລ້ວປະກາດຜູ້ຊະນະໃນງານ' },
          ].map((step, index) => (
            <li
              key={step.title}
              className="rounded-[var(--radius-box)] border border-rule bg-panel p-5"
            >
              <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-brand-soft text-brand-deep">
                <step.icon className="size-4.5" />
              </span>
              <p className="mt-3 font-serif text-lg text-ink">
                <span className="mr-1.5 text-ink-3">{index + 1}.</span>
                {step.title}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
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
              <div key={key} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-panel-2">
                <SiteImage imageKey={key} sizes="(max-width: 768px) 50vw, 380px" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 9 — closing call to action */}
      <Section className="pb-20">
        <div className="rounded-[var(--radius-box)] border border-brand-edge bg-brand-soft px-6 py-10 text-center md:px-12">
          <h2 className="font-serif text-3xl text-ink md:text-4xl">ຮູ້ຈັກຜູ້ສ້າງສັນທີ່ຄູ່ຄວນບໍ?</h2>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            ສົ່ງຊື່ເຂົ້າມາໄດ້ ບໍ່ຈຳເປັນຕ້ອງບອກຊື່ຜູ້ສົ່ງ
          </p>
          <div className="mt-6 flex justify-center">
            <ActionLink href="/submit">ສົ່ງລາຍຊື່</ActionLink>
          </div>
        </div>
      </Section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-4 py-6 text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-serif text-4xl leading-none text-ink">{value}</span>
        <span className="mt-1.5 block text-[12px] text-ink-2">{label}</span>
      </dd>
    </div>
  );
}

/**
 * The one place on the homepage that speaks about the current year. Its
 * heading and call to action follow the phase, so the card is right whether
 * entries are open, nominees are out, or the results are in.
 */
function CurrentEditionCard({ edition }: { edition: Edition | null }) {
  if (!edition) {
    return (
      <div className="rounded-[var(--radius-box)] border border-rule bg-panel p-6">
        <p className="font-serif text-2xl text-ink">ງານປີຕໍ່ໄປ</p>
        <p className="mt-2 text-[13.5px] text-ink-2">ຈະປະກາດໃນໄວໆນີ້</p>
      </div>
    );
  }

  const copy = {
    PUBLISHED: { eyebrow: 'ງານປີນີ້', title: 'ເປີດແລ້ວ', body: 'ເບິ່ງສາຂາ ແລະ ລາຍລະອຽດຂອງງານປີນີ້' },
    NOMINEES_ANNOUNCED: {
      eyebrow: 'ງານປີນີ້',
      title: 'ປະກາດນອມິນີແລ້ວ',
      body: 'ເບິ່ງລາຍຊື່ຜູ້ເຂົ້າຊິງທຸກສາຂາ',
    },
    WINNERS_ANNOUNCED: {
      eyebrow: 'ງານປີນີ້',
      title: 'ປະກາດຜົນແລ້ວ',
      body: 'ເບິ່ງຜູ້ຊະນະທຸກສາຂາຂອງປີນີ້',
    },
    DRAFT: { eyebrow: 'ງານປີນີ້', title: 'ກຳລັງກຽມ', body: '' },
  }[edition.phase];

  return (
    <div className="flex flex-col justify-between rounded-[var(--radius-box)] border border-brand-edge bg-panel p-6">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-brand-deep">
          {copy.eyebrow} · {edition.year}
        </p>
        <p className="mt-2 font-serif text-2xl text-ink">{copy.title}</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{copy.body}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ActionLink href={`/awards/${edition.slug}`} className="px-4 py-2.5 text-[13px]">
          ເບິ່ງງານປີ {edition.year}
        </ActionLink>
        {/* Ticketing and voting are run elsewhere, so these are secondary and
            marked as leaving the site (PRD §7.4). */}
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
  );
}
