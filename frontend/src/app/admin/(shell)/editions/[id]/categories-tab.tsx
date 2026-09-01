'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Plus, Star, Trash2 } from 'lucide-react';

import { CategoryTemplatePicker } from '@/components/admin/category-template-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { Category, CategoryTemplate, Edition } from '@/types/api';
import { emptyToNull, slugify } from '@/lib/utils';

export function CategoriesTab({ edition }: { edition: Edition }) {
  const path = `/admin/editions/${edition.id}/categories`;
  const { data, isLoading, error } = useApi<Category[]>(path);

  // The shortlist is fixed the moment nominees go public — the API refuses
  // an addition past this point too, but disabling it here means the admin
  // sees why before clicking rather than after.
  const locked = edition.phase !== 'DRAFT' && edition.phase !== 'PUBLISHED';

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const invalidate = [path, '/admin/dashboard'];
  const reorder = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${path}/reorder`,
    'POST',
    invalidate,
  );
  const remove = useApiMutation<{ id: string }>(
    (body) => `/admin/categories/${body.id}`,
    'DELETE',
    invalidate,
  );

  /** Swaps a row with its neighbour — simpler to use than drag on a laptop trackpad. */
  function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    const next = [...data];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ items: next.map((category, position) => ({ id: category.id, sortOrder: position })) });
  }

  return (
    <>
      <Card>
        <CardHeader
          title="ສາຂາຂອງປີນີ້"
          aside={
            <>
              <span>{data?.length ?? 0} ສາຂາ</span>
              <Button size="sm" disabled={locked} onClick={() => setCopying(true)}>
                <Copy className="size-3.5" /> ຄັດລອກຈາກປີກ່ອນ
              </Button>
              <Button size="sm" variant="primary" disabled={locked} onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> ເພີ່ມສາຂາ
              </Button>
            </>
          }
        />

        {error != null && (
          <div className="p-4">
            <ErrorNote error={error} />
          </div>
        )}
        {reorder.error && (
          <div className="p-4">
            <ErrorNote error={reorder.error} />
          </div>
        )}

        {locked && (
          <div className="p-4 pb-0">
            <Note>
              ປະກາດຜູ້ເຂົ້າຊີງໄປແລ້ວ — <b className="text-ink-2">ລາຍການສາຂາຄົງທີ່</b> ຈົນກວ່າຈະ
              ຖອນການປະກາດ (ໜ້າ “ຈັດການປີ”)
            </Note>
          </div>
        )}

        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState
            title="ຍັງບໍ່ມີສາຂາ"
            description="ເພີ່ມເອງ ຫຼື ຄັດລອກລາຍການທັງໝົດຈາກປີກ່ອນມາໃນຄລິກດຽວ"
            action={
              <Button variant="primary" disabled={locked} onClick={() => setCopying(true)}>
                ຄັດລອກຈາກປີກ່ອນ
              </Button>
            }
          />
        ) : (
          data.map((category, index) => (
            <div
              key={category.id}
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

              {category.isFeatured && <Star className="size-3.5 shrink-0 fill-brand-soft text-brand" />}

              <div className="min-w-0">
                <p className="truncate text-[14px] text-ink">{category.nameLo}</p>
                <p className="truncate text-[11.5px] text-ink-3">
                  /{category.slug}
                  {category.groupLo && ` · ກຸ່ມ ${category.groupLo}`}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Badge tone={(category._count?.nominations ?? 0) === 0 ? 'stop' : 'neutral'}>
                  ຜູ້ເຂົ້າຊີງ {category._count?.nominations ?? 0} ຄົນ
                </Badge>
                <Button size="sm" onClick={() => setEditing(category)}>
                  ແກ້ໄຂ
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  aria-label={`ລຶບ ${category.nameLo}`}
                  onClick={() => setDeleting(category)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <CategoryDialog
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        category={editing}
        editionId={edition.id}
        existingTemplateIds={new Set((data ?? []).map((c) => c.templateId).filter((id): id is string => id !== null))}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <CopyDialog open={copying} edition={edition} onClose={() => setCopying(false)} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
        }
        pending={remove.isPending}
        danger
        title={`ລຶບສາຂາ “${deleting?.nameLo}”?`}
        description="ລຶບໄດ້ສະເພາະສາຂາທີ່ຍັງບໍ່ມີຜູ້ເຂົ້າຊີງ"
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function CategoryDialog({
  open,
  category,
  editionId,
  existingTemplateIds,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  editionId: string;
  /** Templates already assigned to this edition — greyed out in the picker. */
  existingTemplateIds: Set<string>;
  onClose: () => void;
}) {
  // Only asked when adding a category the edition does not have yet.
  const [template, setTemplate] = useState<CategoryTemplate | null>(null);

  const [form, setForm] = useState({
    slug: category?.slug ?? '',
    nameLo: category?.nameLo ?? '',
    groupLo: category?.groupLo ?? '',
    descriptionLo: category?.descriptionLo ?? '',
    isFeatured: category?.isFeatured ?? false,
  });

  // Reset synchronously during render rather than in an effect — the dialog
  // element (see ui/dialog.tsx) never unmounts on close, only `.close()`s, so
  // without this, saving a category (or cancelling a pick) and reopening
  // "add category" would skip the picker and show what was typed last time.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTemplate(null);
      setForm({
        slug: category?.slug ?? '',
        nameLo: category?.nameLo ?? '',
        groupLo: category?.groupLo ?? '',
        descriptionLo: category?.descriptionLo ?? '',
        isFeatured: category?.isFeatured ?? false,
      });
    }
  }

  const invalidate = [`/admin/editions/${editionId}/categories`, '/admin/dashboard'];
  const create = useApiMutation<Record<string, unknown>>(
    `/admin/editions/${editionId}/categories`,
    'POST',
    invalidate,
  );
  const update = useApiMutation<Record<string, unknown>>(
    `/admin/categories/${category?.id}`,
    'PATCH',
    invalidate,
  );
  const action = category ? update : create;

  // A category picked from the library — every one added through this
  // dialog is — has its name/slug/description live-linked to that library
  // entry (CategoryTemplatesService.update() cascades to it). Only a
  // category with no template of its own, from before the library existed,
  // still owns these fields directly and can edit them here.
  const locked = category ? category.templateId != null : Boolean(template);
  const descriptionPreview = category ? (category.descriptionLo ?? '') : (template?.descriptionLo ?? '');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (category) {
      update.mutate(
        {
          groupLo: emptyToNull(form.groupLo),
          isFeatured: form.isFeatured,
          ...(category.templateId
            ? {}
            : { slug: form.slug, nameLo: form.nameLo, descriptionLo: emptyToNull(form.descriptionLo) }),
        },
        { onSuccess: onClose },
      );
      return;
    }
    if (!template) return;
    create.mutate(
      { templateId: template.id, groupLo: emptyToNull(form.groupLo), isFeatured: form.isFeatured },
      { onSuccess: onClose },
    );
  }

  // Adding a category and no template picked yet: the library search stands
  // in for the whole dialog, since there is nothing else to ask until one is
  // chosen — the per-edition fields below need a name to sit under. A
  // category not yet in the library gets added there first (ຄັງສາຂາ), not here.
  if (!category && !template) {
    return (
      <Dialog open={open} onClose={onClose} title="ເພີ່ມສາຂາ" description="ເລືອກສາຂາຈາກຄັງ">
        <CategoryTemplatePicker exclude={existingTemplateIds} onPick={setTemplate} />
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={category ? 'ແກ້ໄຂສາຂາ' : 'ເພີ່ມສາຂາ'}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="category-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate>
        {category && !locked && (
          <>
            <Field label="ຊື່ສາຂາ (ລາວ)">
              <Input
                required
                value={form.nameLo}
                onChange={(event) => setForm({ ...form, nameLo: event.target.value })}
              />
            </Field>
            <Field label="slug" help="ໃຊ້ໃນ URL — ຕົວອັກສອນລາຕິນນ້ອຍ, ຕົວເລກ ແລະ ຂີດກາງ">
              <Input
                required
                pattern="[a-z0-9\-]+"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
              />
            </Field>
          </>
        )}
        {category && locked && (
          <>
            <Field label="ຊື່ສາຂາ (ລາວ)" help="ມາຈາກຄັງສາຂາ — ໄປແກ້ທີ່ນັ້ນແທນ">
              <Input disabled value={category.nameLo} />
            </Field>
            <Field label="slug" help="ມາຈາກຄັງສາຂາ — ໄປແກ້ທີ່ນັ້ນແທນ">
              <Input disabled value={category.slug} />
            </Field>
          </>
        )}
        {!category && template && (
          <Field label="ສາຂາ">
            <div className="flex items-center gap-2 rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-serif text-[15px] text-ink">{template.nameLo}</span>
                <span className="ml-2 text-[11.5px] text-ink-3">/{template.slug}</span>
              </span>
              <Button type="button" size="sm" onClick={() => setTemplate(null)}>
                ປ່ຽນ
              </Button>
            </div>
          </Field>
        )}
        <Field label="ກຸ່ມ" hint="— ບໍ່ບັງຄັບ" help="ໃຊ້ຕອນສາຂາຫຼາຍ ຢາກແບ່ງເປັນຫົວຂໍ້">
          <Input
            value={form.groupLo}
            onChange={(event) => setForm({ ...form, groupLo: event.target.value })}
          />
        </Field>
        {locked ? (
          <Field label="ຄຳອະທິບາຍ" help="ມາຈາກຄັງສາຂາ — ໄປແກ້ທີ່ນັ້ນແທນ">
            <Textarea disabled value={descriptionPreview} />
          </Field>
        ) : (
          <Field label="ຄຳອະທິບາຍ" hint="— ບໍ່ບັງຄັບ">
            <Textarea
              value={form.descriptionLo}
              onChange={(event) => setForm({ ...form, descriptionLo: event.target.value })}
            />
          </Field>
        )}

        <div className="mb-4 flex items-center gap-3">
          <Switch
            checked={form.isFeatured}
            onChange={(next) => setForm({ ...form, isFeatured: next })}
            label="ຕັ້ງເປັນສາຂາເດັ່ນ"
          />
          <span>
            <span className="block text-[13px] font-semibold text-ink">ສາຂາເດັ່ນ</span>
            <span className="block text-[11.5px] text-ink-3">
              ຂຶ້ນໄຮໄລທ໌ໜ້າຫຼັກ ແລະ ແຖວທຳນຽບຜູ້ຊະນະ · ແນະນຳ 3–6 ສາຂາຕໍ່ປີ
            </span>
          </span>
        </div>

        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}

function CopyDialog({
  open,
  edition,
  onClose,
}: {
  open: boolean;
  edition: Edition;
  onClose: () => void;
}) {
  const { data: editions } = useApi<Edition[]>('/admin/editions');
  const others = (editions ?? []).filter((candidate) => candidate.id !== edition.id);
  const [fromEditionId, setFromEditionId] = useState('');

  const copy = useApiMutation<{ fromEditionId: string }, { copied: number; skipped: number }>(
    `/admin/editions/${edition.id}/categories/copy`,
    'POST',
    [`/admin/editions/${edition.id}/categories`, '/admin/dashboard'],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ຄັດລອກສາຂາຈາກປີອື່ນ"
      description="ສາຂາທີ່ມີ slug ຊ້ຳກັນຢູ່ແລ້ວຈະຖືກຂ້າມ ບໍ່ຂຽນທັບ"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={copy.isPending}>
            ຍົກເລີກ
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!fromEditionId || copy.isPending}
            onClick={() => copy.mutate({ fromEditionId }, { onSuccess: onClose })}
          >
            {copy.isPending ? 'ກຳລັງຄັດລອກ…' : 'ຄັດລອກ'}
          </Button>
        </>
      }
    >
      {others.length === 0 ? (
        <Note>ຍັງບໍ່ມີປີອື່ນໃຫ້ຄັດລອກ</Note>
      ) : (
        <Field label="ຄັດລອກຈາກ">
          <Select value={fromEditionId} onChange={(event) => setFromEditionId(event.target.value)}>
            <option value="">— ເລືອກປີ —</option>
            {others.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.year} · {candidate.titleLo}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {copy.error && <ErrorNote error={copy.error} />}
    </Dialog>
  );
}
