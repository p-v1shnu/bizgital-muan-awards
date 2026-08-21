'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorNote, Spinner } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { useApiMutation, useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { CategoryTemplate } from '@/types/api';

/**
 * Search the category library, or add one that is not in it yet without
 * leaving the page — the point being that a category picked from here always
 * carries the same slug it had the last time some other year picked it.
 */
export function CategoryTemplatePicker({
  exclude,
  onPick,
}: {
  /** Template ids already assigned to this edition, greyed out rather than hidden. */
  exclude: Set<string>;
  onPick: (template: CategoryTemplate) => void;
}) {
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term, 250);
  const [creating, setCreating] = useState(false);

  const { data, isFetching } = useApiPage<CategoryTemplate>(
    debounced.trim().length > 0
      ? `/admin/category-templates?perPage=8&q=${encodeURIComponent(debounced.trim())}`
      : null,
  );

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            className="pl-9"
            placeholder="ຄົ້ນຫາສາຂາຈາກຄັງ…"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          {isFetching && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> ສ້າງໃໝ່
        </Button>
      </div>

      {debounced.trim() && data && (
        <ul className="mt-2 overflow-hidden rounded-[var(--radius-ui-sm)] border border-rule bg-white">
          {data.data.length === 0 ? (
            <li className="px-3 py-2.5 text-[12.5px] text-ink-3">
              ບໍ່ພົບ “{debounced}” ໃນຄັງ — ກົດ “ສ້າງໃໝ່” ເພື່ອເພີ່ມ
            </li>
          ) : (
            data.data.map((template) => {
              const already = exclude.has(template.id);
              return (
                <li key={template.id} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => {
                      onPick(template);
                      setTerm('');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-panel-2 disabled:opacity-45 disabled:hover:bg-transparent"
                  >
                    <span className="font-serif text-[15px] text-ink">{template.nameLo}</span>
                    <span className="text-[11.5px] text-ink-3">/{template.slug}</span>
                    {already && <span className="ml-auto text-[11px] text-ink-3">ຢູ່ໃນປີນີ້ແລ້ວ</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      <QuickCreateDialog
        open={creating}
        initialName={term}
        onClose={() => setCreating(false)}
        onCreated={(template) => {
          setCreating(false);
          setTerm('');
          onPick(template);
        }}
      />
    </>
  );
}

function QuickCreateDialog({
  open,
  initialName,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (template: CategoryTemplate) => void;
}) {
  const [nameLo, setNameLo] = useState(initialName);
  const [slug, setSlug] = useState('');

  const create = useApiMutation<Record<string, unknown>, CategoryTemplate>('/admin/category-templates', 'POST', [
    '/admin/category-templates',
  ]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ສ້າງສາຂາໃໝ່ໃນຄັງ"
      description="ເພີ່ມເຂົ້າຄັງກາງ ແລ້ວໃສ່ເຂົ້າປີນີ້ໃຫ້ເລີຍ — ປີໜ້າຄົ້ນຫາຊື່ນີ້ຄືນໄດ້ ບໍ່ຕ້ອງພິມ slug ໃໝ່"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={create.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="quick-category-template" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'ກຳລັງສ້າງ…' : 'ສ້າງ ແລະ ໃສ່'}
          </Button>
        </>
      }
    >
      <form
        id="quick-category-template"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ nameLo, slug }, { onSuccess: onCreated });
        }}
      >
        <Field label="ຊື່ສາຂາ (ລາວ)">
          <Input required value={nameLo} onChange={(event) => setNameLo(event.target.value)} />
        </Field>
        <Field label="slug" help="ໃຊ້ໃນ URL — ຕົວອັກສອນລາຕິນນ້ອຍ, ຕົວເລກ ແລະ ຂີດກາງ">
          <Input
            required
            pattern="[a-z0-9\-]+"
            placeholder="creator-of-the-year"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </Field>
        {create.error && <ErrorNote error={create.error} />}
      </form>
    </Dialog>
  );
}
