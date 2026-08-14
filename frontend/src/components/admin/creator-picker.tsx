'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorNote, Spinner } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { useApiMutation, useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { Creator } from '@/types/api';

/**
 * Search the creator library, or add someone who is not in it yet without
 * leaving the page — the team is usually mid-way through one category.
 */
export function CreatorPicker({
  exclude,
  onPick,
  pending,
}: {
  /** Creator ids already nominated here, greyed out rather than hidden. */
  exclude: Set<string>;
  onPick: (creatorId: string) => void;
  pending?: boolean;
}) {
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term, 250);
  const [creating, setCreating] = useState(false);

  const { data, isFetching } = useApiPage<Creator>(
    debounced.trim().length > 0
      ? `/admin/creators?perPage=8&q=${encodeURIComponent(debounced.trim())}`
      : null,
  );

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            className="pl-9"
            placeholder="ຄົ້ນຫາຄຣີເອເຕີຈາກຄັງ…"
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
            data.data.map((creator) => {
              const already = exclude.has(creator.id);
              return (
                <li key={creator.id} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    disabled={already || pending}
                    onClick={() => {
                      onPick(creator.id);
                      setTerm('');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-panel-2 disabled:opacity-45 disabled:hover:bg-transparent"
                  >
                    <span className="font-serif text-[15px] text-ink">{creator.nameLo}</span>
                    <span className="text-[11.5px] text-ink-3">@{creator.slug}</span>
                    {already && <span className="ml-auto text-[11px] text-ink-3">ຢູ່ໃນສາຂານີ້ແລ້ວ</span>}
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
        onCreated={(creator) => {
          setCreating(false);
          setTerm('');
          onPick(creator.id);
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
  onCreated: (creator: Creator) => void;
}) {
  const [nameLo, setNameLo] = useState(initialName);
  const [slug, setSlug] = useState('');

  const create = useApiMutation<Record<string, unknown>, Creator>('/admin/creators', 'POST', [
    '/admin/creators',
  ]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ສ້າງຄຣີເອເຕີໃໝ່"
      description="ເພີ່ມເຂົ້າຄັງກາງ ແລ້ວໃສ່ເປັນນອມິນີໃຫ້ເລີຍ — ຮູບ ແລະ bio ຄ່ອຍເຕີມທີຫຼັງໄດ້"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={create.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="quick-creator" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'ກຳລັງສ້າງ…' : 'ສ້າງ ແລະ ໃສ່'}
          </Button>
        </>
      }
    >
      <form
        id="quick-creator"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ nameLo, slug }, { onSuccess: onCreated });
        }}
      >
        <Field label="ຊື່ (ລາວ)">
          <Input required value={nameLo} onChange={(event) => setNameLo(event.target.value)} />
        </Field>
        <Field label="slug" help="ໃຊ້ໃນ URL ໜ້າໂປຣໄຟລ໌ — ຕົວອັກສອນລາຕິນນ້ອຍ, ຕົວເລກ ແລະ ຂີດກາງ">
          <Input
            required
            pattern="[a-z0-9\-]+"
            placeholder="khamla-sisouvanh"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </Field>
        {create.error && <ErrorNote error={create.error} />}
      </form>
    </Dialog>
  );
}
