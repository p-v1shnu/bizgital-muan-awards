import Link from 'next/link';
import type { Metadata } from 'next';

import { Avatar, EmptyNote, LaoText, Section } from '@/components/site/primitives';
import { NOT_FOUND_TITLE } from '@/components/site/not-found-body';
import { apiPath, getPublicOrNotFound, tryGetPublic } from '@/lib/api/server';
import { JsonLd, breadcrumbJsonLd, judgeJsonLd } from '@/lib/structured-data';
import { imageUrl } from '@/lib/images';
import type { PublicJudgeProfile } from '@/types/public';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const judge = await tryGetPublic<PublicJudgeProfile>(apiPath`/judges/${slug}`);
  // The 404 page's title, not a wording of its own — see the year page.
  if (!judge) return { title: NOT_FOUND_TITLE };

  return {
    title: judge.nameLo,
    description: judge.bioLo ?? judge.positionLo,
    alternates: { canonical: `/judges/${judge.slug}` },
    openGraph: {
      title: judge.nameLo,
      images: imageUrl(judge.avatarKey) ? [imageUrl(judge.avatarKey) as string] : undefined,
    },
  };
}

/**
 * A judge's own page — the credential the panel section of a year page could
 * only gesture at before. Built the same way as the creator profile: no page
 * of its own to maintain, assembled from the judge library and whichever
 * years the public may already see.
 */
export default async function JudgePage({ params }: PageProps) {
  const { slug } = await params;
  const judge = await getPublicOrNotFound<PublicJudgeProfile>(apiPath`/judges/${slug}`);

  return (
    <Section>
      <JsonLd
        data={judgeJsonLd({
          nameLo: judge.nameLo,
          nameEn: judge.nameEn,
          slug: judge.slug,
          positionLo: judge.positionLo,
          bioLo: judge.bioLo,
          avatarUrl: imageUrl(judge.avatarKey),
          panels: judge.panels,
        })}
      />
      <JsonLd
        // Two steps, not three: there is no /judges index to point at, and a
        // breadcrumb whose middle link 404s is worse than a short one.
        data={breadcrumbJsonLd([
          { name: 'ໜ້າຫຼັກ', path: '/' },
          { name: judge.nameLo, path: `/judges/${judge.slug}` },
        ])}
      />
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {/* This picture is the subject of the page, not decoration beside a
            link that already names them — so it gets described. */}
        <Avatar creator={judge} size="lg" alt={judge.nameLo} />
        <div className="min-w-0">
          <h1 className="font-serif text-4xl leading-tight text-ink">
            <LaoText text={judge.nameLo} />
          </h1>
          {judge.nameEn && <p className="mt-1 text-[14px] text-ink-3">{judge.nameEn}</p>}
          <p className="mt-3 text-[13px] text-ink-2">{judge.positionLo}</p>
        </div>
      </div>

      {judge.bioLo && (
        <p className="mt-8 max-w-2xl font-sans-looped text-[15px] leading-[1.85] text-ink-2">{judge.bioLo}</p>
      )}

      <h2 className="mt-12 text-[10.5px] font-bold uppercase text-ink-3">ຄະນະກຳມະການປີ</h2>

      {judge.panels.length === 0 ? (
        <EmptyNote className="mt-4">ຍັງບໍ່ມີປະຫວັດທີ່ປະກາດແລ້ວ</EmptyNote>
      ) : (
        <ol className="mt-4 overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel">
          {judge.panels.map((panel) => (
            <li
              key={panel.editionSlug}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline px-5 py-4 last:border-b-0"
            >
              <span className="font-serif text-2xl text-ink">{panel.year}</span>
              <Link
                href={`/awards/${panel.editionSlug}`}
                className="text-[14px] text-ink-2 hover:text-ink hover:underline"
              >
                {panel.editionTitleLo}
              </Link>
              {panel.role === 'CHAIR' && (
                <span className="ml-auto rounded-full border border-brand-edge bg-brand-soft px-2.5 py-0.5 text-[10.5px] font-bold text-brand-deep">
                  ປະທານ
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
