import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CreatorCard, EmptyNote, Section } from '@/components/site/primitives';
import { NOT_FOUND_TITLE } from '@/components/site/not-found-body';
import { getPublicOrDraft, tryGetPublic } from '@/lib/api/server';
import { JsonLd, breadcrumbJsonLd, categoryJsonLd } from '@/lib/structured-data';
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
  // The 404 page's title, not a wording of its own — see the year page.
  if (!page) return { title: NOT_FOUND_TITLE };

  const title = `${page.nameLo} · ${page.edition.titleLo}`;
  // Once there is a winner, say so in the description. It is the answer the
  // page exists to give, and a search result that already contains it is the
  // difference between being read and being scrolled past — the category's own
  // blurb describes the award, not who took it.
  const winner = page.nominees.find((nominee) => nominee.isWinner);
  const description = winner
    ? `${winner.creator.nameLo} ຊະນະສາຂາ ${page.nameLo} ໃນ ${page.edition.titleLo}`
    : (page.descriptionLo ?? undefined);

  return {
    alternates: { canonical: `/awards/${page.edition.slug}/${page.slug}` },
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl(page.edition.heroImageKey)
        ? [imageUrl(page.edition.heroImageKey) as string]
        : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { year, category } = await params;
  const { preview } = await searchParams;

  const page = await getPublicOrDraft<PublicCategoryPage>(
    `/editions/${year}/categories/${category}`,
    { preview },
  );
  if (!page) notFound();

  const nominees = [...page.nominees].sort((a, b) => Number(b.isWinner) - Number(a.isWinner));

  return (
    <Section>
      <JsonLd
        data={categoryJsonLd({
          nameLo: page.nameLo,
          nameEn: page.nameEn,
          descriptionLo: page.descriptionLo,
          slug: page.slug,
          edition: page.edition,
          nominees,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'ໜ້າຫຼັກ', path: '/' },
          { name: page.edition.titleLo, path: `/awards/${page.edition.slug}` },
          { name: page.nameLo, path: `/awards/${page.edition.slug}/${page.slug}` },
        ])}
      />
      {/* Same warning as the year page: this page can be reached directly, and a
          category page is where a winner shows first. */}
      {page.preview && (
        <div className="mb-6 rounded-[var(--radius-box)] bg-ink px-4 py-2.5 text-center text-[12.5px] text-[#f0e9df]">
          <Eye className="mr-2 inline size-4" />
          {page.preview.aheadOfPublic ? (
            <>
              ນີ້ແມ່ນ<b className="mx-1">ພຣີວິວຂອງແອດມິນ</b>— ລາຍຊື່ຜູ້ເຂົ້າຊີງ ຫຼື ຜູ້ຊະນະ ໃນໜ້ານີ້
              <b className="mx-1">ຄົນທົ່ວໄປຍັງເຫັນບໍ່ໄດ້</b>ຈົນກວ່າຈະປະກາດ
            </>
          ) : (
            <>ນີ້ແມ່ນ<b className="mx-1">ພຣີວິວ</b>— ປີນີ້ຍັງບໍ່ໄດ້ເຜີຍແຜ່ ຄົນທົ່ວໄປຍັງເຫັນບໍ່ໄດ້</>
          )}
        </div>
      )}

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
        <EmptyNote className="mt-10">ລາຍຊື່ຜູ້ເຂົ້າຊີງສາຂານີ້ຈະປະກາດພາຍຫຼັງ</EmptyNote>
      ) : (
        <>
          <p className="mt-8 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-3">
            ຜູ້ເຂົ້າຊີງ {nominees.length} ຄົນ
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
