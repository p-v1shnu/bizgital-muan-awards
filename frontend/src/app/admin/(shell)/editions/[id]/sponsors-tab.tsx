'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';

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
 * Sponsors of one year, in groups the team names itself.
 *
 * The groups used to be an enum of six with their Lao names written into this
 * file, so a year that sold a package nobody had thought of needed a migration
 * and a deploy. They are the year's own rows now: add a group, name it, put logos
 * in it. Bound to the year rather than shared, because renaming a shared group
 * would rewrite what a finished year says it sold.
 */
export function SponsorsTab({ edition }: { edition: Edition }) {
  const tiersPath = `/admin/editions/${edition.id}/sponsor-tiers`;
  const sponsorsPath = `/admin/editions/${edition.id}/sponsors`;
  const invalidate = [tiersPath, sponsorsPath, '/admin/dashboard'];

  const tiers = useApi<SponsorTier[]>(tiersPath);
  const sponsors = useApi<Sponsor[]>(sponsorsPath);

  const [tierDialog, setTierDialog] = useState<{ tier: SponsorTier | null } | null>(null);
  const [deletingTier, setDeletingTier] = useState<SponsorTier | null>(null);
  const [sponsorDialog, setSponsorDialog] = useState<{
    sponsor: Sponsor | null;
    tierId: string;
  } | null>(null);
  const [deletingSponsor, setDeletingSponsor] = useState<Sponsor | null>(null);

  const copyPrevious = useApiMutation<void>(`${tiersPath}/copy-from-previous`, 'POST', invalidate);
  const reorderTiers = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${tiersPath}/reorder`,
    'POST',
    invalidate,
  );
  const reorderSponsors = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${sponsorsPath}/reorder`,
    'POST',
    invalidate,
  );
  const removeSponsor = useApiMutation<{ id: string }>(
    (body) => `/admin/sponsors/${body.id}`,
    'DELETE',
    invalidate,
  );

  const rows = tiers.data ?? [];
  const logos = sponsors.data ?? [];

  function moveTier(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    reorderTiers.mutate({ items: next.map((tier, at) => ({ id: tier.id, sortOrder: at })) });
  }

  /** Logos move inside their own group; the group's own place is the arrows above. */
  function moveSponsor(sponsor: Sponsor, direction: -1 | 1) {
    const withinTier = logos.filter((row) => row.tierId === sponsor.tierId);
    const index = withinTier.findIndex((row) => row.id === sponsor.id);
    const target = index + direction;
    if (target < 0 || target >= withinTier.length) return;
    [withinTier[index], withinTier[target]] = [withinTier[target], withinTier[index]];

    // Send the whole edition's order back, so one group's shuffle cannot leave
    // another group's numbering behind.
    const reordered = rows.flatMap((tier) =>
      tier.id === sponsor.tierId
        ? withinTier
        : logos.filter((row) => row.tierId === tier.id),
    );
    reorderSponsors.mutate({
      items: reordered.map((row, at) => ({ id: row.id, sortOrder: at })),
    });
  }

  const failure =
    tiers.error ??
    sponsors.error ??
    copyPrevious.error ??
    reorderTiers.error ??
    reorderSponsors.error ??
    removeSponsor.error;

  return (
    <>
      <Card>
        <CardHeader
          title="ໝວດສະປອນເຊີປີນີ້"
          aside={
            <>
              <span>
                {rows.length} ໝວດ · {logos.length} ໂລໂກ້
              </span>
              {rows.length === 0 && (
                <Button
                  size="sm"
                  disabled={copyPrevious.isPending}
                  onClick={() => copyPrevious.mutate()}
                >
                  <Copy className="size-3.5" />
                  {copyPrevious.isPending ? 'ກຳລັງຄັດລອກ…' : 'ຄັດລອກຈາກປີກ່ອນ'}
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={() => setTierDialog({ tier: null })}>
                <Plus className="size-3.5" /> ເພີ່ມໝວດ
              </Button>
            </>
          }
        />

        {failure != null && (
          <div className="p-4">
            <ErrorNote error={failure} />
          </div>
        )}

        {tiers.isLoading || sponsors.isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            title="ຍັງບໍ່ມີໝວດສະປອນເຊີ"
            description="ຕັ້ງໝວດເອງໄດ້ຕາມແພັກເກັດທີ່ຂາຍປີນີ້ ແລ້ວຄ່ອຍໃສ່ໂລໂກ້ · ຖ້າປີນີ້ຄືປີກ່ອນ ກົດຄັດລອກມາທັງໝວດ ແລະ ໂລໂກ້ ແລ້ວລຶບລາຍທີ່ບໍ່ຕໍ່ອອກ"
            action={
              <Button variant="primary" onClick={() => setTierDialog({ tier: null })}>
                ເພີ່ມໝວດ
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-hairline">
            {rows.map((tier, index) => {
              const inTier = logos.filter((row) => row.tierId === tier.id);
              return (
                <div key={tier.id}>
                  <div className="flex items-center gap-2 bg-panel-2/50 px-4 py-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`ຍ້າຍໝວດ ${tier.nameLo} ຂຶ້ນ`}
                        disabled={index === 0 || reorderTiers.isPending}
                        onClick={() => moveTier(index, -1)}
                        className="text-ink-3 hover:text-ink disabled:opacity-25"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`ຍ້າຍໝວດ ${tier.nameLo} ລົງ`}
                        disabled={index === rows.length - 1 || reorderTiers.isPending}
                        onClick={() => moveTier(index, 1)}
                        className="text-ink-3 hover:text-ink disabled:opacity-25"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                    <p className="font-serif text-[17px] text-ink">{tier.nameLo}</p>
                    <span className="text-[11.5px] text-ink-3">{inTier.length} ໂລໂກ້</span>
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" onClick={() => setTierDialog({ tier })}>
                        ປ່ຽນຊື່
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        aria-label={`ລຶບໝວດ ${tier.nameLo}`}
                        onClick={() => setDeletingTier(tier)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {inTier.map((sponsor, position) => {
                    const logo = imagePublicUrl(sponsor.logoKey);
                    return (
                      <div key={sponsor.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label={`ຍ້າຍ ${sponsor.name} ຂຶ້ນ`}
                            disabled={position === 0 || reorderSponsors.isPending}
                            onClick={() => moveSponsor(sponsor, -1)}
                            className="text-ink-3 hover:text-ink disabled:opacity-25"
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`ຍ້າຍ ${sponsor.name} ລົງ`}
                            disabled={position === inTier.length - 1 || reorderSponsors.isPending}
                            onClick={() => moveSponsor(sponsor, 1)}
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
                          <Button
                            size="sm"
                            onClick={() => setSponsorDialog({ sponsor, tierId: sponsor.tierId })}
                          >
                            ແກ້ໄຂ
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            aria-label={`ລຶບ ${sponsor.name}`}
                            onClick={() => setDeletingSponsor(sponsor)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="px-4 pb-3">
                    <Button
                      size="sm"
                      onClick={() => setSponsorDialog({ sponsor: null, tierId: tier.id })}
                    >
                      <Plus className="size-3.5" /> ເພີ່ມໂລໂກ້ໃນໝວດນີ້
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {tierDialog && (
        <TierDialog
          key={tierDialog.tier?.id ?? 'new-tier'}
          tier={tierDialog.tier}
          editionId={edition.id}
          onClose={() => setTierDialog(null)}
        />
      )}

      {sponsorDialog && (
        <SponsorDialog
          key={sponsorDialog.sponsor?.id ?? `new-${sponsorDialog.tierId}`}
          sponsor={sponsorDialog.sponsor}
          tierId={sponsorDialog.tierId}
          tiers={rows}
          editionId={edition.id}
          onClose={() => setSponsorDialog(null)}
        />
      )}

      {deletingTier && (
        <DeleteTierDialog
          tier={deletingTier}
          others={rows.filter((tier) => tier.id !== deletingTier.id)}
          holds={logos.filter((row) => row.tierId === deletingTier.id).length}
          invalidate={invalidate}
          onClose={() => setDeletingTier(null)}
        />
      )}

      <ConfirmDialog
        open={deletingSponsor !== null}
        onClose={() => setDeletingSponsor(null)}
        onConfirm={() =>
          deletingSponsor &&
          removeSponsor.mutate(
            { id: deletingSponsor.id },
            { onSuccess: () => setDeletingSponsor(null) },
          )
        }
        pending={removeSponsor.isPending}
        danger
        title={`ລຶບ “${deletingSponsor?.name}”?`}
        confirmLabel="ລຶບ"
      />
    </>
  );
}

/** Adding or renaming a group. */
function TierDialog({
  tier,
  editionId,
  onClose,
}: {
  tier: SponsorTier | null;
  editionId: string;
  onClose: () => void;
}) {
  const [nameLo, setNameLo] = useState(tier?.nameLo ?? '');
  const invalidate = [`/admin/editions/${editionId}/sponsor-tiers`];
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
      open
      onClose={onClose}
      title={tier ? 'ປ່ຽນຊື່ໝວດ' : 'ເພີ່ມໝວດສະປອນເຊີ'}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={action.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="tier-form" variant="primary" disabled={action.isPending}>
            {action.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
          </Button>
        </>
      }
    >
      <form
        id="tier-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          action.mutate({ nameLo }, { onSuccess: onClose });
        }}
      >
        <Field label="ຊື່ໝວດ" help="ຂຶ້ນເປັນຫົວຂໍ້ຂອງກຸ່ມໂລໂກ້ໃນໜ້າປີ">
          <Input
            required
            autoFocus
            placeholder="ຜູ້ສະໜັບສະໜູນຫຼັກ"
            value={nameLo}
            onChange={(event) => setNameLo(event.target.value)}
          />
        </Field>
        {action.error && <ErrorNote error={action.error} />}
      </form>
    </Dialog>
  );
}

/**
 * Deleting a group that still holds logos asks where they go first. The logos are
 * a year's paying sponsors; losing one to a click is not a recoverable mistake.
 */
function DeleteTierDialog({
  tier,
  others,
  holds,
  invalidate,
  onClose,
}: {
  tier: SponsorTier;
  others: SponsorTier[];
  holds: number;
  invalidate: string[];
  onClose: () => void;
}) {
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '');
  const remove = useApiMutation<{ query: string }>(
    (vars) => `/admin/sponsor-tiers/${tier.id}${vars.query}`,
    'DELETE',
    invalidate,
  );
  const blocked = holds > 0 && others.length === 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`ລຶບໝວດ “${tier.nameLo}”?`}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={remove.isPending}>
            ຍົກເລີກ
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={remove.isPending || blocked}
            onClick={() =>
              remove.mutate(
                { query: holds > 0 ? `?moveToTierId=${encodeURIComponent(moveTo)}` : '' },
                { onSuccess: onClose },
              )
            }
          >
            {remove.isPending ? 'ກຳລັງລຶບ…' : 'ລຶບ'}
          </Button>
        </>
      }
    >
      {holds === 0 ? (
        <Note>ໝວດນີ້ວ່າງຢູ່ ລຶບໄດ້ເລີຍ</Note>
      ) : blocked ? (
        <Note tone="brand">
          ໝວດນີ້ມີ {holds} ໂລໂກ້ ແລະ ຍັງບໍ່ມີໝວດອື່ນໃຫ້ຍ້າຍໄປ — ສ້າງໝວດໃໝ່ກ່ອນ ຫຼື ລຶບໂລໂກ້ອອກເອງ
        </Note>
      ) : (
        <>
          <Note tone="brand">
            ໝວດນີ້ມີ <b>{holds} ໂລໂກ້</b> — ເລືອກໝວດທີ່ຈະຍ້າຍໄປ ໂລໂກ້ຈະບໍ່ຫາຍໄປກັບໝວດ
          </Note>
          <div className="mt-4">
            <Field label="ຍ້າຍໂລໂກ້ໄປໝວດ">
              <Select value={moveTo} onChange={(event) => setMoveTo(event.target.value)}>
                {others.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.nameLo}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      )}
      {remove.error && <ErrorNote error={remove.error} />}
    </Dialog>
  );
}

function SponsorDialog({
  sponsor,
  tierId,
  tiers,
  editionId,
  onClose,
}: {
  sponsor: Sponsor | null;
  tierId: string;
  tiers: SponsorTier[];
  editionId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: sponsor?.name ?? '',
    websiteUrl: sponsor?.websiteUrl ?? '',
    tierId: sponsor?.tierId ?? tierId,
  });
  const [logoKey, setLogoKey] = useState(sponsor?.logoKey ?? null);

  const invalidate = [
    `/admin/editions/${editionId}/sponsors`,
    `/admin/editions/${editionId}/sponsor-tiers`,
    '/admin/dashboard',
  ];
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
      open
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
        <Field label="ໝວດ">
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
