'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { ImageUpload, imagePublicUrl } from '@/components/admin/image-upload';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { Edition, Sponsor, SponsorTier } from '@/types/api';
import { emptyToNull } from '@/lib/utils';

/**
 * Two lists, one above the other: the tiers this year sells, and the logos
 * filed under them. The tiers used to be six values in the code — the words
 * are the team's now, so they are edited here rather than in a release.
 *
 * Both cards invalidate both paths. Renaming a tier changes the badge on every
 * sponsor row, and adding a sponsor changes the count that decides whether a
 * tier can still be deleted.
 */
export function SponsorsTab({ edition }: { edition: Edition }) {
  const tiersPath = `/admin/editions/${edition.id}/sponsor-tiers`;
  const sponsorsPath = `/admin/editions/${edition.id}/sponsors`;
  const invalidate = [tiersPath, sponsorsPath, '/admin/dashboard'];

  const tiers = useApi<SponsorTier[]>(tiersPath);

  return (
    <>
      <TiersCard
        edition={edition}
        tiers={tiers.data}
        isLoading={tiers.isLoading}
        error={tiers.error}
        invalidate={invalidate}
      />
      <SponsorsCard edition={edition} tiers={tiers.data ?? []} invalidate={invalidate} />
    </>
  );
}

function TiersCard({
  edition,
  tiers,
  isLoading,
  error,
  invalidate,
}: {
  edition: Edition;
  tiers: SponsorTier[] | undefined;
  isLoading: boolean;
  error: unknown;
  invalidate: string[];
}) {
  const path = `/admin/editions/${edition.id}/sponsor-tiers`;

  const [editing, setEditing] = useState<SponsorTier | null>(null);
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState<SponsorTier | null>(null);

  const remove = useApiMutation<{ id: string }>(
    (body) => `/admin/sponsor-tiers/${body.id}`,
    'DELETE',
    invalidate,
  );
  const reorder = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${path}/reorder`,
    'POST',
    invalidate,
  );

  function move(index: number, direction: -1 | 1) {
    if (!tiers) return;
    const target = index + direction;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ items: next.map((tier, position) => ({ id: tier.id, sortOrder: position })) });
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="ລະດັບສະປອນເຊີ"
          aside={
            <>
              <span>{tiers?.length ?? 0} ລະດັບ</span>
              <Button size="sm" onClick={() => setCopying(true)}>
                <Copy className="size-3.5" /> ຄັດລອກຈາກປີກ່ອນ
              </Button>
              <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> ເພີ່ມລະດັບ
              </Button>
            </>
          }
        />

        {(error != null || reorder.error != null || remove.error != null) && (
          <div className="p-4">
            <ErrorNote error={error ?? reorder.error ?? remove.error} />
          </div>
        )}

        {isLoading ? (
          <LoadingBlock />
        ) : !tiers?.length ? (
          <EmptyState
            title="ຍັງບໍ່ມີລະດັບ"
            description="ຕ້ອງມີລະດັບກ່ອນ ຈຶ່ງເພີ່ມສະປອນເຊີໄດ້ — ຄັດລອກລາຍການຈາກປີກ່ອນ ຫຼື ຕັ້ງຊື່ເອງ"
            action={
              <Button variant="primary" onClick={() => setCopying(true)}>
                ຄັດລອກຈາກປີກ່ອນ
              </Button>
            }
          />
        ) : (
          tiers.map((tier, index) => {
            const held = tier._count?.sponsors ?? 0;
            return (
              <div
                key={tier.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`ຍ້າຍລະດັບ ${tier.nameLo} ຂຶ້ນ`}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                    className="text-ink-3 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`ຍ້າຍລະດັບ ${tier.nameLo} ລົງ`}
                    disabled={index === tiers.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                    className="text-ink-3 hover:text-ink disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <p className="min-w-0 truncate text-[14px] text-ink">{tier.nameLo}</p>

                <div className="ml-auto flex items-center gap-2">
                  <Badge tone={held === 0 ? 'neutral' : 'brand'}>{held} ສະປອນເຊີ</Badge>
                  <Button size="sm" onClick={() => setEditing(tier)}>
                    ປ່ຽນຊື່
                  </Button>
                  {/*
                    Disabled while it holds logos, with the count right beside
                    it: the server refuses this anyway, but a button that fails
                    is worse than one that says why it cannot be pressed.
                  */}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={held > 0}
                    aria-label={
                      held > 0 ? `ລຶບ ${tier.nameLo} ບໍ່ໄດ້ ຍັງມີສະປອນເຊີ` : `ລຶບ ${tier.nameLo}`
                    }
                    onClick={() => setDeleting(tier)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </Card>

      <TierDialog
        key={editing?.id ?? 'new-tier'}
        open={creating || editing !== null}
        tier={editing}
        editionId={edition.id}
        invalidate={invalidate}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <CopyTiersDialog
        open={copying}
        edition={edition}
        invalidate={invalidate}
        onClose={() => setCopying(false)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
        }
        pending={remove.isPending}
        danger
        title={`ລຶບລະດັບ “${deleting?.nameLo}”?`}
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function SponsorsCard({
  edition,
  tiers,
  invalidate,
}: {
  edition: Edition;
  tiers: SponsorTier[];
  invalidate: string[];
}) {
  const path = `/admin/editions/${edition.id}/sponsors`;
  const { data, isLoading, error } = useApi<Sponsor[]>(path);

  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Sponsor | null>(null);

  const remove = useApiMutation<{ id: string }>(
    (body) => `/admin/sponsors/${body.id}`,
    'DELETE',
    invalidate,
  );
  const reorder = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${path}/reorder`,
    'POST',
    invalidate,
  );

  /**
   * The list is grouped by tier, so a sponsor moves within its own tier only —
   * dragging a gold logo above a title one would say something the tier does
   * not, and the year page groups by tier anyway.
   */
  function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    if (data[target].tierId !== data[index].tierId) return;
    const next = [...data];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ items: next.map((row, position) => ({ id: row.id, sortOrder: position })) });
  }

  return (
    <>
      <Card>
        <CardHeader
          title="ສະປອນເຊີປີນີ້"
          aside={
            <>
              <span>{data?.length ?? 0} ລາຍ</span>
              <Button
                size="sm"
                variant="primary"
                disabled={tiers.length === 0}
                onClick={() => setCreating(true)}
              >
                <Plus className="size-3.5" /> ເພີ່ມສະປອນເຊີ
              </Button>
            </>
          }
        />

        {(error != null || reorder.error != null) && (
          <div className="p-4">
            <ErrorNote error={error ?? reorder.error} />
          </div>
        )}

        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState
            title="ຍັງບໍ່ມີສະປອນເຊີ"
            description={
              tiers.length === 0
                ? 'ຕັ້ງລະດັບຢູ່ກ່ອງຂ້າງເທິງກ່ອນ ແລ້ວຈຶ່ງເພີ່ມສະປອນເຊີໄດ້'
                : 'ສະປອນເຊີຜູກກັບປີ ບໍ່ຂຶ້ນໜ້າແຮກ'
            }
            action={
              tiers.length > 0 ? (
                <Button variant="primary" onClick={() => setCreating(true)}>
                  ເພີ່ມສະປອນເຊີ
                </Button>
              ) : undefined
            }
          />
        ) : (
          data.map((sponsor, index) => {
            const logo = imagePublicUrl(sponsor.logoKey);
            const canMoveUp = index > 0 && data[index - 1].tierId === sponsor.tierId;
            const canMoveDown = index < data.length - 1 && data[index + 1].tierId === sponsor.tierId;
            return (
              <div
                key={sponsor.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`ຍ້າຍ ${sponsor.name} ຂຶ້ນ`}
                    disabled={!canMoveUp || reorder.isPending}
                    onClick={() => move(index, -1)}
                    className="text-ink-3 hover:text-ink disabled:opacity-25"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`ຍ້າຍ ${sponsor.name} ລົງ`}
                    disabled={!canMoveDown || reorder.isPending}
                    onClick={() => move(index, 1)}
                    className="text-ink-3 hover:text-ink disabled:opacity-25"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
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
                  <Badge tone={sponsor.tier.sortOrder === 0 ? 'brand' : 'neutral'}>
                    {sponsor.tier.nameLo}
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
        tiers={tiers}
        invalidate={invalidate}
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

function TierDialog({
  open,
  tier,
  editionId,
  invalidate,
  onClose,
}: {
  open: boolean;
  tier: SponsorTier | null;
  editionId: string;
  invalidate: string[];
  onClose: () => void;
}) {
  const [nameLo, setNameLo] = useState(tier?.nameLo ?? '');

  const create = useApiMutation<Record<string, unknown>>(
    `/admin/editions/${editionId}/sponsor-tiers`,
    'POST',
    invalidate,
  );
  const update = useApiMutation<Record<string, unknown>>(
    `/admin/sponsor-tiers/${tier?.id}`,
    'PATCH',
    invalidate,
  );
  const action = tier ? update : create;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tier ? 'ປ່ຽນຊື່ລະດັບ' : 'ເພີ່ມລະດັບ'}
      description="ຊື່ນີ້ຄືຫົວຂໍ້ທີ່ຂຶ້ນເທິງກຸ່ມໂລໂກ້ໃນໜ້າປີ"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="sponsor-tier-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form
        id="sponsor-tier-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate({ nameLo }, { onSuccess: onClose });
        }}
      >
        <Field label="ຊື່ລະດັບ">
          <Input required value={nameLo} onChange={(event) => setNameLo(event.target.value)} />
        </Field>

        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}

/**
 * How a new year gets its tier list. What a year sells changes far less often
 * than who buys it, so last year's headings are almost always the right start —
 * and a name already here is skipped rather than duplicated.
 */
function CopyTiersDialog({
  open,
  edition,
  invalidate,
  onClose,
}: {
  open: boolean;
  edition: Edition;
  invalidate: string[];
  onClose: () => void;
}) {
  const { data: editions } = useApi<Edition[]>('/admin/editions');
  const others = (editions ?? []).filter((candidate) => candidate.id !== edition.id);
  const [fromEditionId, setFromEditionId] = useState('');

  const copy = useApiMutation<{ fromEditionId: string }, { copied: number; skipped: number }>(
    `/admin/editions/${edition.id}/sponsor-tiers/copy`,
    'POST',
    invalidate,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ຄັດລອກລະດັບຈາກປີອື່ນ"
      description="ຄັດລອກແຕ່ຊື່ລະດັບ ບໍ່ເອົາສະປອນເຊີມາ · ຊື່ທີ່ມີຢູ່ແລ້ວຈະຖືກຂ້າມ"
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

function SponsorDialog({
  open,
  sponsor,
  editionId,
  tiers,
  invalidate,
  onClose,
}: {
  open: boolean;
  sponsor: Sponsor | null;
  editionId: string;
  tiers: SponsorTier[];
  invalidate: string[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: sponsor?.name ?? '',
    websiteUrl: sponsor?.websiteUrl ?? '',
    // A new logo lands in the first tier, which is the top of the wall — the
    // team reads the list top down, and there is no default tier any more.
    tierId: sponsor?.tierId ?? tiers[0]?.id ?? '',
  });
  const [logoKey, setLogoKey] = useState(sponsor?.logoKey ?? null);

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
              websiteUrl: emptyToNull(form.websiteUrl),
              tierId: form.tierId,
              logoKey: logoKey ?? null,
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
            value={form.tierId}
            onChange={(event) => setForm({ ...form, tierId: event.target.value })}
          >
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.nameLo}
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
