'use client';

import { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { ImageUpload, imagePublicUrl } from '@/components/admin/image-upload';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { Edition, Sponsor, SponsorTier } from '@/types/api';

export const TIER_LABEL: Record<SponsorTier, string> = {
  TITLE: 'ຜູ້ສະໜັບສະໜູນຫຼັກ',
  GOLD: 'ລະດັບຄຳ',
  SILVER: 'ລະດັບເງິນ',
  SUPPORTER: 'ຜູ້ສະໜັບສະໜູນ',
  PARTNER: 'ພາດເນີ',
  MEDIA: 'ສື່ມວນຊົນ',
};

const TIERS = Object.keys(TIER_LABEL) as SponsorTier[];

export function SponsorsTab({ edition }: { edition: Edition }) {
  const path = `/admin/editions/${edition.id}/sponsors`;
  const { data, isLoading, error } = useApi<Sponsor[]>(path);

  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Sponsor | null>(null);

  const remove = useApiMutation<{ id: string }>(
    (body) => `/admin/sponsors/${body.id}`,
    'DELETE',
    [path, '/admin/dashboard'],
  );

  return (
    <>
      <Card>
        <CardHeader
          title="ສະປອນເຊີປີນີ້"
          aside={
            <>
              <span>{data?.length ?? 0} ລາຍ</span>
              <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> ເພີ່ມສະປອນເຊີ
              </Button>
            </>
          }
        />

        {error != null && (
          <div className="p-4">
            <ErrorNote error={error} />
          </div>
        )}

        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState
            title="ຍັງບໍ່ມີສະປອນເຊີ"
            description="ສະປອນເຊີຜູກກັບປີ ບໍ່ຂຶ້ນໜ້າແຮກ"
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                ເພີ່ມສະປອນເຊີ
              </Button>
            }
          />
        ) : (
          data.map((sponsor) => {
            const logo = imagePublicUrl(sponsor.logoKey);
            return (
              <div
                key={sponsor.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    className="h-9 w-20 shrink-0 rounded border border-rule bg-panel-2 object-contain p-1"
                  />
                ) : (
                  <span className="grid h-9 w-20 shrink-0 place-items-center rounded border border-dashed border-rule text-[10px] text-ink-3">
                    ບໍ່ມີໂລໂກ້
                  </span>
                )}

                <div className="min-w-0">
                  <p className="truncate text-[14px] text-ink">{sponsor.name}</p>
                  {sponsor.websiteUrl && (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 truncate text-[11.5px] text-ink-3 hover:text-brand-deep hover:underline"
                    >
                      {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Badge tone={sponsor.tier === 'TITLE' ? 'brand' : 'neutral'}>
                    {TIER_LABEL[sponsor.tier]}
                  </Badge>
                  <Button size="sm" onClick={() => setEditing(sponsor)}>
                    ແກ້ໄຂ
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`ລຶບ ${sponsor.name}`}
                    onClick={() => setDeleting(sponsor)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </Card>

      <SponsorDialog
        key={editing?.id ?? 'new'}
        open={creating || editing !== null}
        sponsor={editing}
        editionId={edition.id}
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
        title={`ລຶບ “${deleting?.name}”?`}
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function SponsorDialog({
  open,
  sponsor,
  editionId,
  onClose,
}: {
  open: boolean;
  sponsor: Sponsor | null;
  editionId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: sponsor?.name ?? '',
    websiteUrl: sponsor?.websiteUrl ?? '',
    tier: sponsor?.tier ?? ('SUPPORTER' as SponsorTier),
  });
  const [logoKey, setLogoKey] = useState(sponsor?.logoKey ?? null);

  const invalidate = [`/admin/editions/${editionId}/sponsors`, '/admin/dashboard'];
  const create = useApiMutation<Record<string, unknown>>(
    `/admin/editions/${editionId}/sponsors`,
    'POST',
    invalidate,
  );
  const update = useApiMutation<Record<string, unknown>>(
    `/admin/sponsors/${sponsor?.id}`,
    'PATCH',
    invalidate,
  );
  const action = sponsor ? update : create;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={sponsor ? 'ແກ້ໄຂສະປອນເຊີ' : 'ເພີ່ມສະປອນເຊີ'}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="sponsor-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form
        id="sponsor-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate(
            {
              name: form.name,
              websiteUrl: form.websiteUrl || undefined,
              tier: form.tier,
              logoKey: logoKey ?? undefined,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="ຊື່">
          <Input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="ລະດັບ">
          <Select
            value={form.tier}
            onChange={(event) => setForm({ ...form, tier: event.target.value as SponsorTier })}
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {TIER_LABEL[tier]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ເວັບໄຊ" hint="— ບໍ່ບັງຄັບ">
          <Input
            type="url"
            placeholder="https://…"
            value={form.websiteUrl}
            onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
          />
        </Field>

        <div className="mb-4">
          <ImageUpload
            label="ໂລໂກ້"
            hint="PNG ພື້ນໃສ ຈະງາມທີ່ສຸດ"
            folder="sponsors"
            value={logoKey}
            onChange={setLogoKey}
          />
        </div>

        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}
