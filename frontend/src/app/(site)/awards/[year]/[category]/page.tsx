import Link from 'next/link';
import type { Metadata } from 'next';

import { CreatorCard, Section } from '@/components/site/primitives';
import { getPublic, getPublicOrNotFound, tryGetPublic } from '@/lib/api/server';
import { imageUrl } from '@/lib/images';
import type { PublicCategoryPage } from '@/types/public';

interface PageProps {
  params: Promise<{ year: string; category: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/**
 * Its own page so a single category can be shared to Facebook and come up
 * with the right title and picture, rather than dropping the reader at the
 * top of a long year page (PRD §6.1).
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, category } = await params;
  const page = await tryGetPublic<PublicCategoryPage>(`/editions/${year}/categories/${category}`);
  if (!page) return { title: 'ບໍ່ພົບສາຂານີ້' };

  const title = `${page.nameLo} · ${page.edition.titleLo}`;
  return {
    alternates: { canonical: `/awards/${page.edition.slug}/${page.slug}` },
    title,
    description: page.descriptionLo ?? undefined,
    openGraph: {
      title,
      description: page.descriptionLo ?? undefined,
      images: imageUrl(page.edition.heroImageKey)
        ? [imageUrl(page.edition.heroImageKey) as string]
        : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { year, category } = await params;
  const { preview } = await searchParams;

  const page = await getPublicOrNotFound<PublicCategoryPage>(
    `/editions/${year}/categories/${category}`,
    { preview },
  );

  const nominees = [...page.nominees].sort((a, b) => Number(b.isWinner) - Number(a.isWinner));

  return (
    <Section>
      <nav className="mb-6 text-[13px] text-ink-3">
        <Link href={`/awards/${page.edition.slug}`} className="hover:text-ink hover:underline">
          {page.edition.titleLo}
        </Link>
        <span className="mx-2 text-rule">/</span>
        <span className="text-ink">{page.nameLo}</span>
      </nav>

      <div className="foil mb-5 h-[3px] w-16 rounded-sm" aria-hidden />
      <h1 className="font-serif text-4xl leading-tight text-ink md:text-5xl">{page.nameLo}</h1>
      {page.descriptionLo && (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{page.descriptionLo}</p>
      )}

      {nominees.length === 0 ? (
        <p className="mt-10 rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-10 text-center text-[14px] text-ink-2">
          ລາຍຊື່ຜູ້ເຂົ້າຊິງສາຂານີ້ຈະປະກາດພາຍຫຼັງ
        </p>
      ) : (
        <>
          <p className="mt-8 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-3">
            {nominees.length} ນອມິນີ
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nominees.map((nominee) => (
              <CreatorCard
                key={nominee.id}
                creator={nominee.creator}
                isWinner={nominee.isWinner}
                href={`/creators/${nominee.creator.slug}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-10">
        <Link
          href={`/awards/${page.edition.slug}`}
          className="text-[13.5px] text-brand-deep hover:underline"
        >
          ← ກັບໄປໜ້າງານປີ {page.edition.year}
        </Link>
      </div>
    </Section>
  );
}
