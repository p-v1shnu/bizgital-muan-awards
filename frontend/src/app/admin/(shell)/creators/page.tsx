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
import type { Creator } from '@/types/api';
import { emptyToNull, randomSlug, slugify } from '@/lib/utils';

const SOCIALS = ['facebook', 'tiktok', 'youtube', 'instagram'] as const;

export default function CreatorsPage() {
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(term, 250);

  const query = `/admin/creators?page=${page}&perPage=25${
    debounced.trim() ? `&q=${encodeURIComponent(debounced.trim())}` : ''
  }`;
  const { data, isLoading, error } = useApiPage<Creator>(query);

  const [editing, setEditing] = useState<Creator | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Creator | null>(null);

  const remove = useApiMutation<{ id: string }>(
    (body) => `/admin/creators/${body.id}`,
    'DELETE',
    ['/admin/creators'],
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ຄັງຄຣີເອເຕີ' }]}
        actions={
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> ເພີ່ມຄຣີເອເຕີ
          </Button>
        }
      />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Card>
          <CardHeader
            title="ຄັງກາງ"
            aside={data?.meta ? `${data.meta.total} ຄົນ` : undefined}
          />

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
              description="ຄຣີເອເຕີໃສ່ເທື່ອດຽວ ໃຊ້ຊ້ຳໄດ້ທຸກປີ"
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  ເພີ່ມຄຣີເອເຕີ
                </Button>
              }
            />
          ) : (
            data.data.map((creator) => (
              <div
                key={creator.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                <Avatar name={creator.nameLo} avatarKey={creator.avatarKey} />
                <div className="min-w-0">
                  <p className="truncate font-serif text-[15.5px] leading-tight text-ink">
                    {creator.nameLo}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-3">
                    @{creator.slug}
                    {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 &&
                      ` · ${Object.keys(creator.socialLinks).join(', ')}`}
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Badge>ຜູ້ເຂົ້າຊີງ {creator._count?.nominations ?? 0} ຄົນ</Badge>
                  <Button size="sm" onClick={() => setEditing(creator)}>
                    ແກ້ໄຂ
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`ລຶບ ${creator.nameLo}`}
                    onClick={() => setDeleting(creator)}
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

      <CreatorDialog
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        creator={editing}
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
        description="ລຶບໄດ້ສະເພາະຄົນທີ່ຍັງບໍ່ເປັນຜູ້ເຂົ້າຊີງໃນປີໃດ"
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function CreatorDialog({
  open,
  creator,
  onClose,
}: {
  open: boolean;
  creator: Creator | null;
  onClose: () => void;
}) {
  // A slug someone has to think up on the spot is exactly what slows down
  // adding a name fast — so a new creator starts with one nobody had to
  // type (see randomSlug), swapped for a real one derived from the primary
  // name the moment that name gives up anything sluggable (see slugify).
  // Editing an existing creator never does either — their slug already
  // shows up as a URL, and quietly rewriting it here would break that link.
  const [form, setForm] = useState(() => ({
    nameLo: creator?.nameLo ?? '',
    nameEn: creator?.nameEn ?? '',
    slug: creator ? creator.slug : randomSlug('creator'),
    bioLo: creator?.bioLo ?? '',
  }));
  const [avatarKey, setAvatarKey] = useState(creator?.avatarKey ?? null);
  const [socials, setSocials] = useState<Record<string, string>>(creator?.socialLinks ?? {});
  // Once the slug field itself has been typed into, the primary name no
  // longer overwrites it — a deliberate edit should stick.
  const [slugTouched, setSlugTouched] = useState(creator !== null);

  // Reset synchronously during render, not in an effect — the dialog element
  // (ui/dialog.tsx) never unmounts on close, only `.close()`s, so without
  // this, saving one creator and opening "add" again showed the one just
  // typed rather than a blank form.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({
        nameLo: creator?.nameLo ?? '',
        nameEn: creator?.nameEn ?? '',
        slug: creator ? creator.slug : randomSlug('creator'),
        bioLo: creator?.bioLo ?? '',
      });
      setAvatarKey(creator?.avatarKey ?? null);
      setSocials(creator?.socialLinks ?? {});
      setSlugTouched(creator !== null);
    }
  }

  function setNameLo(nameLo: string) {
    setForm((f) => {
      if (slugTouched) return { ...f, nameLo };
      const derived = slugify(nameLo);
      return { ...f, nameLo, slug: derived || f.slug };
    });
  }

  const create = useApiMutation<Record<string, unknown>>('/admin/creators', 'POST', ['/admin/creators']);
  const update = useApiMutation<Record<string, unknown>>(`/admin/creators/${creator?.id}`, 'PATCH', [
    '/admin/creators',
  ]);
  const action = creator ? update : create;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="lg"
      title={creator ? 'ແກ້ໄຂຄຣີເອເຕີ' : 'ເພີ່ມຄຣີເອເຕີ'}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="creator-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form
        id="creator-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate(
            {
              nameLo: form.nameLo,
              nameEn: emptyToNull(form.nameEn),
              slug: form.slug,
              bioLo: emptyToNull(form.bioLo),
              avatarKey: avatarKey ?? null,
              socialLinks: socials,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ຊື່ຫຼັກ" help="ຊື່ຄົນ ຫຼື ຊື່ຊ່ອງ — ແລ້ວແຕ່ອັນໃດຄືຊື່ທີ່ໃຊ້ຈິງ">
            <Input required value={form.nameLo} onChange={(event) => setNameLo(event.target.value)} />
          </Field>
          <Field label="ຊື່ອື່ນ" hint="— ບໍ່ບັງຄັບ" help="ຊື່ຮຽກອີກແບບ — ຄົນອ່ານເຫັນນຳ ຊື່ຫຼັກ">
            <Input
              value={form.nameEn}
              onChange={(event) => setForm({ ...form, nameEn: event.target.value })}
            />
          </Field>
        </div>

        <Field
          label="slug"
          help={`ໜ້າໂປຣໄຟລ໌ — /creators/${form.slug || '…'} · ສ້າງໃຫ້ອັດຕະໂນມັດຈາກຊື່ຫຼັກ ພິມແກ້ໄດ້ທຸກເວລາ`}
        >
          <Input
            required
            pattern="[a-z0-9\-]+"
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setForm({ ...form, slug: slugify(event.target.value) });
            }}
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
            hint="ຮູບຈະຖືກຕັດເປັນວົງມົນ"
            folder="creators"
            aspect="square"
            value={avatarKey}
            onChange={setAvatarKey}
          />
        </div>

        <p className="mb-1.5 text-xs font-semibold text-ink-2">ລິງກ໌ໂຊຊຽວ</p>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {SOCIALS.map((platform) => (
            <Input
              key={platform}
              type="url"
              placeholder={`${platform}…`}
              value={socials[platform] ?? ''}
              onChange={(event) => setSocials({ ...socials, [platform]: event.target.value })}
            />
          ))}
        </div>

        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}
