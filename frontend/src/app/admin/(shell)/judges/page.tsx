'use client';

import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

import { Avatar } from '../editions/[id]/nominees-tab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ImageUpload } from '@/components/admin/image-upload';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { Pager } from '@/components/admin/pager';
import { useApiMutation, useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { Judge } from '@/types/api';
import { emptyToNull } from '@/lib/utils';

export default function JudgesPage() {
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(term, 250);

  const query = `/admin/judges?page=${page}&perPage=25${
    debounced.trim() ? `&q=${encodeURIComponent(debounced.trim())}` : ''
  }`;
  const { data, isLoading, error } = useApiPage<Judge>(query);

  const [editing, setEditing] = useState<Judge | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Judge | null>(null);

  const remove = useApiMutation<{ id: string }>((body) => `/admin/judges/${body.id}`, 'DELETE', [
    '/admin/judges',
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ຄັງກຳມະການ' }]}
        actions={
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> ເພີ່ມກຳມະການ
          </Button>
        }
      />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Card>
          <CardHeader title="ຄັງກາງ" aside={data?.meta ? `${data.meta.total} ຄົນ` : undefined} />

          <div className="border-b border-rule p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                className="pl-9"
                placeholder="ຄົ້ນຫາຕາມຊື່…"
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
              description="ກຳມະການໃສ່ເທື່ອດຽວ ໃຊ້ຊ້ຳຂ້າມປີໄດ້"
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  ເພີ່ມກຳມະການ
                </Button>
              }
            />
          ) : (
            data.data.map((judge) => (
              <div
                key={judge.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                <Avatar name={judge.nameLo} avatarKey={judge.avatarKey} />
                <div className="min-w-0">
                  <p className="truncate font-serif text-[15.5px] leading-tight text-ink">
                    {judge.nameLo}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-3">{judge.positionLo}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge>{judge._count?.editions ?? 0} ປີ</Badge>
                  <Button size="sm" onClick={() => setEditing(judge)}>
                    ແກ້ໄຂ
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`ລຶບ ${judge.nameLo}`}
                    onClick={() => setDeleting(judge)}
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

      <JudgeDialog
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        judge={editing}
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
        description="ລຶບໄດ້ສະເພາະຄົນທີ່ຍັງບໍ່ຖືກເລືອກເຂົ້າປີໃດ"
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function JudgeDialog({
  open,
  judge,
  onClose,
}: {
  open: boolean;
  judge: Judge | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nameLo: judge?.nameLo ?? '',
    nameEn: judge?.nameEn ?? '',
    positionLo: judge?.positionLo ?? '',
    bioLo: judge?.bioLo ?? '',
  });
  const [avatarKey, setAvatarKey] = useState(judge?.avatarKey ?? null);
  // Reset synchronously during render, not in an effect — the dialog element
  // (ui/dialog.tsx) never unmounts on close, only `.close()`s, so without
  // this, saving one judge and opening "add" again showed the one just
  // typed rather than a blank form.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({
        nameLo: judge?.nameLo ?? '',
        nameEn: judge?.nameEn ?? '',
        positionLo: judge?.positionLo ?? '',
        bioLo: judge?.bioLo ?? '',
      });
      setAvatarKey(judge?.avatarKey ?? null);
    }
  }

  const create = useApiMutation<Record<string, unknown>>('/admin/judges', 'POST', ['/admin/judges']);
  const update = useApiMutation<Record<string, unknown>>(`/admin/judges/${judge?.id}`, 'PATCH', [
    '/admin/judges',
  ]);
  const action = judge ? update : create;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={judge ? 'ແກ້ໄຂກຳມະການ' : 'ເພີ່ມກຳມະການ'}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="judge-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form
        id="judge-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate(
            {
              nameLo: form.nameLo,
              nameEn: emptyToNull(form.nameEn),
              positionLo: form.positionLo,
              bioLo: emptyToNull(form.bioLo),
              avatarKey: avatarKey ?? null,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="ຊື່ (ລາວ)">
          <Input
            required
            value={form.nameLo}
            onChange={(event) => setForm({ ...form, nameLo: event.target.value })}
          />
        </Field>
        <Field label="ຕຳແໜ່ງ / ອົງກອນ" help="ຂຶ້ນກ້ອງຊື່ໃນໜ້າປີ">
          <Input
            required
            placeholder="ຜູ້ອຳນວຍການ, Muan Media"
            value={form.positionLo}
            onChange={(event) => setForm({ ...form, positionLo: event.target.value })}
          />
        </Field>
        <Field label="ແນະນຳຕົວ" hint="— ບໍ່ບັງຄັບ">
          <Textarea
            value={form.bioLo}
            onChange={(event) => setForm({ ...form, bioLo: event.target.value })}
          />
        </Field>

        <div className="mb-4">
          <ImageUpload
            label="ຮູບໂປຣໄຟລ໌"
            folder="judges"
            aspect="square"
            value={avatarKey}
            onChange={setAvatarKey}
          />
        </div>

        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}
