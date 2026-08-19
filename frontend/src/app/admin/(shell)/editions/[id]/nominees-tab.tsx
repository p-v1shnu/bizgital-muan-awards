'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Star, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { CreatorPicker } from '@/components/admin/creator-picker';
import { cn } from '@/lib/utils';
import { imagePublicUrl } from '@/components/admin/image-upload';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { Category, Edition, Nomination } from '@/types/api';

/** Categories on the left, their nominees on the right. */
export function NomineesTab({ edition }: { edition: Edition }) {
  const categoriesPath = `/admin/editions/${edition.id}/categories`;
  const { data: categories, isLoading } = useApi<Category[]>(categoriesPath);

  if (isLoading) return <LoadingBlock />;
  if (!categories?.length) {
    return (
      <Card>
        <EmptyState title="ຍັງບໍ່ມີສາຂາ" description="ໄປແທັບ “ສາຂາ” ເພື່ອເພີ່ມກ່ອນ" />
      </Card>
    );
  }

  // Only mounted once the list is here, which is what lets the panel choose the
  // category it opens on without an effect — see the comment below.
  return <CategoryPanel categories={categories} categoriesPath={categoriesPath} />;
}

function CategoryPanel({
  categories,
  categoriesPath,
}: {
  categories: Category[];
  categoriesPath: string;
}) {
  /**
   * Opens on the first category that still needs work, since that is why the
   * team came to this tab — and stays wherever they put it after that.
   *
   * Worked out in the initializer, which runs once for this list: an effect
   * seeding it rendered a frame with nothing selected and the panel beside it
   * blank, and deriving it on every render would be worse still — adding the
   * first nominee stops that category needing work, so the panel would jump to
   * another one while the team was still typing in this one.
   */
  const [selectedId, setSelectedId] = useState<string>(() => {
    const needsWork = categories.find((category) => (category._count?.nominations ?? 0) === 0);
    return (needsWork ?? categories[0]).id;
  });

  const selected = useMemo(
    () => categories.find((category) => category.id === selectedId) ?? null,
    [categories, selectedId],
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid min-h-[26rem] lg:grid-cols-[266px_1fr]">
        <div className="border-b border-rule lg:border-b-0 lg:border-r">
          <CardHeader title="ສາຂາ" aside={`${categories.length}`} />
          {categories.map((category) => {
            const on = category.id === selectedId;
            const count = category._count?.nominations ?? 0;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedId(category.id)}
                className={cn(
                  'relative flex w-full items-center gap-2.5 border-b border-hairline px-3.5 py-2.5 text-left text-[13px] last:border-b-0',
                  on ? 'bg-white font-semibold text-ink' : 'text-ink-2 hover:bg-panel-2',
                )}
              >
                {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />}
                {category.isFeatured && (
                  <Star className="size-3.5 shrink-0 fill-brand-soft text-brand" />
                )}
                <span className="truncate">{category.nameLo}</span>
                <span
                  className={cn('ml-auto text-[11px] font-bold', count === 0 ? 'text-stop' : 'text-ink-3')}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {selected ? (
          <NomineeList category={selected} categoriesPath={categoriesPath} />
        ) : (
          <EmptyState title="ເລືອກສາຂາຢູ່ຊ້າຍມື" />
        )}
      </div>
    </Card>
  );
}

function NomineeList({ category, categoriesPath }: { category: Category; categoriesPath: string }) {
  const path = `/admin/categories/${category.id}/nominations`;
  const { data, isLoading, error } = useApi<Nomination[]>(path);
  const [removing, setRemoving] = useState<Nomination | null>(null);

  const invalidate = [path, categoriesPath, '/admin/dashboard'];
  const add = useApiMutation<{ creatorId: string }>(path, 'POST', invalidate);
  const setWinner = useApiMutation<{ id: string; isWinner: boolean }>(
    (vars) => `/admin/nominations/${vars.id}/winner`,
    'PATCH',
    invalidate,
    // The id addresses the row; only isWinner belongs in the body.
    (vars) => ({ isWinner: vars.isWinner }),
  );
  const remove = useApiMutation<{ id: string }>(
    (vars) => `/admin/nominations/${vars.id}`,
    'DELETE',
    invalidate,
  );
  const reorder = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${path}/reorder`,
    'POST',
    invalidate,
  );

  /**
   * Swaps a row with its neighbour. The list is sorted winner-first, so only
   * the nominees below the winner can be moved relative to each other.
   */
  function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    const next = [...data];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ items: next.map((nomination, position) => ({ id: nomination.id, sortOrder: position })) });
  }

  const alreadyIn = new Set((data ?? []).map((nomination) => nomination.creatorId));

  return (
    <div className="flex min-w-0 flex-col">
      <CardHeader
        title={category.nameLo}
        aside={
          <>
            {category.isFeatured && <Badge tone="brand">ສາຂາເດັ່ນ</Badge>}
            <span>
              {data?.length ?? 0} ຜູ້ເຂົ້າຊີງ · ຜູ້ຊະນະ {data?.filter((n) => n.isWinner).length ?? 0}
            </span>
          </>
        }
      />

      <div className="border-b border-rule p-3">
        <CreatorPicker
          exclude={alreadyIn}
          pending={add.isPending}
          onPick={(creatorId) => add.mutate({ creatorId })}
        />
        {add.error && (
          <div className="mt-2">
            <ErrorNote error={add.error} />
          </div>
        )}
      </div>

      {error != null && (
        <div className="p-4">
          <ErrorNote error={error} />
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState title="ຍັງບໍ່ມີຜູ້ເຂົ້າຊີງໃນສາຂານີ້" description="ຄົ້ນຫາຄຣີເອເຕີຈາກຄັງຂ້າງເທິງ" />
      ) : (
        data.map((nomination, index) => (
          <div
            key={nomination.id}
            className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
          >
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="ຍ້າຍຂຶ້ນ"
                disabled={index === 0 || reorder.isPending}
                onClick={() => move(index, -1)}
                className="text-ink-3 hover:text-ink disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label="ຍ້າຍລົງ"
                disabled={index === data.length - 1 || reorder.isPending}
                onClick={() => move(index, 1)}
                className="text-ink-3 hover:text-ink disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>

            <Avatar name={nomination.creator.nameLo} avatarKey={nomination.creator.avatarKey} />

            <div className="min-w-0">
              <p className="truncate font-serif text-[15.5px] leading-tight text-ink">
                {nomination.creator.nameLo}
              </p>
              <p className="truncate text-[11.5px] text-ink-3">
                @{nomination.creator.slug}
                {nomination.creator.socialLinks &&
                  ` · ${Object.keys(nomination.creator.socialLinks).join(', ')}`}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                disabled={setWinner.isPending}
                onClick={() =>
                  setWinner.mutate({ id: nomination.id, isWinner: !nomination.isWinner })
                }
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap text-xs',
                  nomination.isWinner ? 'font-bold text-brand-deep' : 'text-ink-3 hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'size-4 shrink-0 rounded-full border bg-white',
                    nomination.isWinner ? 'border-[5px] border-brand-deep' : 'border-[1.5px] border-rule',
                  )}
                />
                ຜູ້ຊະນະ
              </button>
              <Button
                size="sm"
                variant="danger"
                aria-label={`ເອົາ ${nomination.creator.nameLo} ອອກ`}
                onClick={() => setRemoving(nomination)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))
      )}

      <p className="mt-auto border-t border-rule px-4 py-3 text-[11.5px] text-ink-3">
        ລູກສອນເພື່ອຮຽງລຳດັບ · ຕິດ “ຜູ້ຊະນະ” ໄດ້ພຽງ 1 ຄົນຕໍ່ສາຂາ — ຕິດຄົນໃໝ່ ຄົນເກົ່າຈະຫຼຸດອອກເອງ
      </p>

      {setWinner.error && (
        <div className="p-4">
          <ErrorNote error={setWinner.error} />
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing && remove.mutate({ id: removing.id }, { onSuccess: () => setRemoving(null) })
        }
        pending={remove.isPending}
        danger
        title={`ເອົາ “${removing?.creator.nameLo}” ອອກຈາກສາຂານີ້?`}
        description="ຄຣີເອເຕີຍັງຢູ່ໃນຄັງ ພຽງແຕ່ບໍ່ເປັນຜູ້ເຂົ້າຊີງຂອງສາຂານີ້ອີກ"
        confirmLabel="ເອົາອອກ"
      />
    </div>
  );
}

export function Avatar({ name, avatarKey }: { name: string; avatarKey: string | null }) {
  const src = imagePublicUrl(avatarKey);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="size-9 shrink-0 rounded-full border border-rule object-cover" />;
  }
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-rule bg-panel-2 font-serif text-sm text-ink-3">
      {name.trim().charAt(0)}
    </span>
  );
}
