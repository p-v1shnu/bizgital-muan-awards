'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, Info } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { CategoriesTab } from './categories-tab';
import { DetailsTab } from './details-tab';
import { EditionTabs, type EditionTab } from './tabs';
import { ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { JudgesTab } from './judges-tab';
import { NomineesTab } from './nominees-tab';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { PhaseBadge } from '@/components/ui/badge';
import { PreviewLink } from '@/components/admin/preview-link';
import { PublishPanel } from './publish-panel';
import { SponsorsTab } from './sponsors-tab';
import { useApi } from '@/lib/api/hooks';
import type { Category, Edition, EditionJudge, Sponsor } from '@/types/api';

export default function EditionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <Suspense fallback={<LoadingBlock />}>
      <EditionDetail id={id} />
    </Suspense>
  );
}

function EditionDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as EditionTab | null) ?? 'details';

  const { data: edition, isLoading, error } = useApi<Edition>(`/admin/editions/${id}`);
  const { data: categories } = useApi<Category[]>(`/admin/editions/${id}/categories`);
  const { data: judges } = useApi<EditionJudge[]>(`/admin/editions/${id}/judges`);
  const { data: sponsors } = useApi<Sponsor[]>(`/admin/editions/${id}/sponsors`);

  if (isLoading) return <LoadingBlock />;
  if (error != null || !edition) {
    return (
      <PageBody>
        <ErrorNote error={error ?? new Error('ບໍ່ພົບປີນີ້')} />
      </PageBody>
    );
  }

  const nomineeCount = (categories ?? []).reduce(
    (total, category) => total + (category._count?.nominations ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ປີທີ່ຈັດງານ', href: '/admin/editions' }, { label: String(edition.year) }]}
        status={<PhaseBadge phase={edition.phase} />}
        actions={
          edition.phase !== 'DRAFT' && (
            <ButtonLink href={`/awards/${edition.slug}`} size="sm" target="_blank">
              <Eye className="size-3.5" /> ເບິ່ງໜ້າຈິງ
            </ButtonLink>
          )
        }
      />

      {edition.phase === 'DRAFT' && (
        <div className="flex flex-wrap items-center gap-2.5 bg-ink px-6 py-2.5 text-xs text-[#f0e9df]">
          <Info className="size-4 shrink-0" />
          ປີນີ້ຍັງເປັນ<b className="mx-0.5">ຮ່າງ</b>— ຄົນນອກຍັງເຂົ້າບໍ່ໄດ້ ແກ້ໄຂໄດ້ຢ່າງອິດສະລະ
          <span className="ml-auto">
            <PreviewLink editionId={edition.id} />
          </span>
        </div>
      )}

      <EditionTabs
        counts={{
          categories: categories?.length,
          nominees: nomineeCount,
          judges: judges?.length,
          sponsors: sponsors?.length,
        }}
      />

      <PageBody>
        {tab === 'details' ? (
          // Only this tab carries the right rail: the two switches belong with
          // the event's own settings, not with the per-tab content lists.
          <div className="grid items-start gap-4 xl:grid-cols-[1fr_336px]">
            <DetailsTab edition={edition} />
            <div className="flex flex-col gap-3.5">
              <PublishPanel edition={edition} categories={categories ?? []} judges={judges?.length ?? 0} />
            </div>
          </div>
        ) : tab === 'categories' ? (
          <CategoriesTab edition={edition} />
        ) : tab === 'nominees' ? (
          <NomineesTab edition={edition} />
        ) : tab === 'judges' ? (
          <JudgesTab edition={edition} />
        ) : (
          <SponsorsTab edition={edition} />
        )}
      </PageBody>
    </>
  );
}
