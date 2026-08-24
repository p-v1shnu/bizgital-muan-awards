'use client';

import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { Pager } from '@/components/admin/pager';
import { useApiMutation, useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { CategoryTemplate } from '@/types/api';
import { emptyToNull, slugify } from '@/lib/utils';

/**
 * The library editions pick their categories from — browsing it here is what
 * answers "do we already have this award" before adding a new one inside an
 * edition. Assigning one into a year still happens on that year's own
 * categories tab; this page only manages the library entries themselves.
 */
export default function CategoryTemplatesPage() {
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(term, 250);

  const query = `/admin/category-templates?page=${page}&perPage=25${
    debounced.trim() ? `&q=${encodeURIComponent(debounced.trim())}` : ''
  }`;
  const { data, isLoading, error } = useApiPage<CategoryTemplate>(query);

  const [editing, setEditing] = useState<CategoryTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CategoryTemplate | null>(null);

  const remove = useApiMutation<{ id: string }>(
    (body) => `/admin/category-templates/${body.id}`,
    'DELETE',
    ['/admin/category-templates'],
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ຄັງສາຂາ' }]}
        actions={
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> ເພີ່ມສາຂາ
          </Button>
        }
      />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Card>
          <CardHeader title="ຄັງກາງ" aside={data?.meta ? `${data.meta.total} ສາຂາ` : undefined} />

          <div className="border-b border-rule p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                className="pl-9"
                placeholder="ຄົ້ນຫາຕາມຊື່ ຫຼື slug…"
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingBlock />
          ) : !data?.data.length ? (
            <EmptyState
              title={debounced ? `ບໍ່ພົບ “${debounced}”` : 'ຄັງຍັງວ່າງຢູ່'}
              description="ສາຂາໃສ່ເທື່ອດຽວ ໃຊ້ຊ້ຳໄດ້ທຸກປີ — ໄປ tab ສາຂາຂອງແຕ່ລະປີເພື່ອໃສ່ເຂົ້າປີໃດປີໜຶ່ງ"
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  ເພີ່ມສາຂາ
                </Button>
              }
            />
          ) : (
            data.data.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-serif text-[15.5px] leading-tight text-ink">
                    {template.nameLo}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-3">/{template.slug}</p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Badge tone={(template._count?.categories ?? 0) === 0 ? 'stop' : 'neutral'}>
                    ໃຊ້ໃນ {template._count?.categories ?? 0} ປີ
                  </Badge>
                  <Button size="sm" onClick={() => setEditing(template)}>
                    ແກ້ໄຂ
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`ລຶບ ${template.nameLo}`}
                    onClick={() => setDeleting(template)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {data?.meta && <Pager meta={data.meta} onChange={setPage} />}
        </Card>
      </PageBody>

      <CategoryTemplateDialog
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        template={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
        }
        pending={remove.isPending}
        danger
        title={`ລຶບ “${deleting?.nameLo}”?`}
        description="ລຶບໄດ້ສະເພາະສາຂາທີ່ບໍ່ໄດ້ຖືກໃສ່ຢູ່ໃນປີໃດ — ຖ້າຖືກໃຊ້ຢູ່ ໃຫ້ເອົາອອກຈາກປີເຫຼົ່ານັ້ນກ່ອນ"
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function CategoryTemplateDialog({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: CategoryTemplate | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nameLo: template?.nameLo ?? '',
    nameEn: template?.nameEn ?? '',
    slug: template?.slug ?? '',
  });
  // Reset synchronously during render, not in an effect — the dialog element
  // (ui/dialog.tsx) never unmounts on close, only `.close()`s, so without
  // this, saving one category and opening "add" again showed the one just
  // typed rather than a blank form.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({ nameLo: template?.nameLo ?? '', nameEn: template?.nameEn ?? '', slug: template?.slug ?? '' });
    }
  }

  const create = useApiMutation<Record<string, unknown>>('/admin/category-templates', 'POST', [
    '/admin/category-templates',
  ]);
  const update = useApiMutation<Record<string, unknown>>(`/admin/category-templates/${template?.id}`, 'PATCH', [
    '/admin/category-templates',
  ]);
  const action = template ? update : create;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={template ? 'ແກ້ໄຂສາຂາ' : 'ເພີ່ມສາຂາເຂົ້າຄັງ'}
      description={
        template
          ? 'ບໍ່ກະທົບສາຂາທີ່ຖືກໃສ່ເຂົ້າປີໃດໆໄປແລ້ວ — ປີເຫຼົ່ານັ້ນຍັງໃຊ້ຊື່ເກົ່າຂອງຕົນເອງ'
          : undefined
      }
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="category-template-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form
        id="category-template-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate(
            { nameLo: form.nameLo, nameEn: emptyToNull(form.nameEn), slug: form.slug },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="ຊື່ສາຂາ (ລາວ)">
          <Input
            required
            value={form.nameLo}
            onChange={(event) => setForm({ ...form, nameLo: event.target.value })}
          />
        </Field>
        <Field label="ຊື່ (ອັງກິດ)" hint="— ບໍ່ບັງຄັບ">
          <Input
            value={form.nameEn}
            onChange={(event) => setForm({ ...form, nameEn: event.target.value })}
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

        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}
