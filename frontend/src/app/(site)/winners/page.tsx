import Link from 'next/link';
import type { Metadata } from 'next';

import { ActionLink, Avatar, Section } from '@/components/site/primitives';
import { SiteImage } from '@/components/site/site-image';
import { getPublic } from '@/lib/api/server';
import { pageSeo } from '@/lib/page-seo';
import { JsonLd, winnersArchiveJsonLd } from '@/lib/structured-data';
import type { WinnersYear } from '@/types/public';

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await pageSeo('winners', {
    title: 'ທຳນຽບຜູ້ຊະນະ',
    description: 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ຂອງມ່ວນອາວອດສ໌',
  });
  return { alternates: { canonical: '/winners' }, title, description };
}

/**
 * One row per year, newest first. Years still in progress are absent — the
 * API only returns years that have announced results, so the page never shows
 * a heading with nothing under it (PRD §6.1.3).
 */
export default async function WinnersPage() {
  const years = await getPublic<WinnersYear[]>('/winners');

  return (
    <Section eyebrow="ຕະຫຼອດທຸກປີ" title="ທຳນຽບຜູ້ຊະນະ" titleAs="h1">
      {years && years.length > 0 && <JsonLd data={winnersArchiveJsonLd(years)} />}
      {!years || years.length === 0 ? (
        <p className="rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-12 text-center text-[14px] text-ink-2">
          ຍັງບໍ່ມີປີໃດປະກາດຜົນ — ກັບມາເບິ່ງອີກຫຼັງງານທຳອິດ
        </p>
      ) : (
        <div className="space-y-6">
          {years.map((year) => {
            // Featured categories lead; the rest fill the row if there is space.
            const shown = [...year.categories]
              .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
              .slice(0, 4);

            return (
              <article
                key={year.id}
                className="grid overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel md:grid-cols-[300px_1fr]"
              >
                <Link href={`/awards/${year.slug}`} className="relative block min-h-44 bg-panel-2">
                  {/* Inside the link, so this alt becomes part of what the
                      link is called — "ມ່ວນອາວອດສ໌ 2025 2025" reads better than
                      a bare number, and the year's key visual stops being
                      invisible to an image search. */}
                  <SiteImage
                    imageKey={year.heroImageKey}
                    alt={year.titleLo}
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                  <span className="absolute bottom-3 left-4 font-serif text-4xl text-white drop-shadow">
                    {year.year}
                  </span>
                </Link>

                <div className="p-5">
                  <h2 className="font-serif text-2xl text-ink">{year.titleLo}</h2>

                  {shown.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-ink-3">ຍັງບໍ່ໄດ້ບັນທຶກຜູ້ຊະນະ</p>
                  ) : (
                    <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {shown.map((category) => (
                        <li key={category.id} className="flex items-center gap-3">
                          <Avatar creator={category.winner} alt={category.winner.nameLo} />
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
                              {category.nameLo}
                            </p>
                            <Link
                              href={`/creators/${category.winner.slug}`}
                              className="block truncate font-serif text-[19px] leading-tight text-ink hover:underline"
                            >
                              {category.winner.nameLo}
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-5">
                    <ActionLink
                      href={`/awards/${year.slug}`}
                      tone="quiet"
                      className="px-4 py-2.5 text-[13px]"
                    >
                      ເບິ່ງຜົນທັງໝົດ
                    </ActionLink>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Section>
  );
}
