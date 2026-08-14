'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, FoilRule } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ErrorNote, Note } from '@/components/ui/feedback';
import { Field, Input, Switch } from '@/components/ui/field';
import { PHASE_LABEL } from '@/components/ui/badge';
import { PHASE_ORDER } from '@/components/admin/phase-steps';
import { useApiMutation } from '@/lib/api/hooks';
import type { Category, Edition, EditionPhase } from '@/types/api';

/**
 * The two switches of PRD §4, side by side but visibly separate — a year that
 * is backfilled has to reach WINNERS_ANNOUNCED without its form ever opening,
 * so these must never read as one control.
 */
export function PublishPanel({ edition, categories }: { edition: Edition; categories: Category[] }) {
  const nextPhase = PHASE_ORDER[PHASE_ORDER.indexOf(edition.phase) + 1] as EditionPhase | undefined;
  const checks = buildChecklist(edition, categories, nextPhase);
  const blocking = checks.filter((check) => !check.ok && check.blocksNext);

  const [confirming, setConfirming] = useState(false);

  const changePhase = useApiMutation<{ phase: EditionPhase }>(
    `/admin/editions/${edition.id}/phase`,
    'PATCH',
    ['/admin/editions', '/admin/dashboard'],
  );

  return (
    <>
      <Card className="overflow-hidden border-brand-edge">
        <FoilRule className="rounded-none" />
        <CardHeader title="ສະຫວິດ 1 · ໜ້າປີສະແດງຫຍັງ" />
        <CardBody>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-deep">
            ຢູ່ບ່ອນນີ້
          </p>
          <p className="mb-3 font-serif text-xl text-ink">{PHASE_LABEL[edition.phase]}</p>

          <ul className="mb-3">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 py-1.5 text-[12.5px]">
                {check.ok ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                ) : (
                  <X className={`mt-0.5 size-4 shrink-0 ${check.blocksNext ? 'text-stop' : 'text-ink-3'}`} />
                )}
                <span className={check.ok ? 'text-ink-2' : 'text-ink'}>
                  {check.label}
                  <span className="block text-[11px] text-ink-3">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          {nextPhase ? (
            <>
              <Button
                variant="primary"
                className="w-full"
                disabled={blocking.length > 0 || changePhase.isPending}
                onClick={() => setConfirming(true)}
              >
                {changePhase.isPending ? 'ກຳລັງດຳເນີນການ…' : `ໄປຂັ້ນ “${PHASE_LABEL[nextPhase]}”`}
              </Button>
              {blocking.length > 0 && (
                <p className="mt-2 text-[11.5px] text-stop">
                  ຕ້ອງແກ້ {blocking.length} ຢ່າງຂ້າງເທິງກ່ອນ
                </p>
              )}
            </>
          ) : (
            <Note>ປີນີ້ຮອດຂັ້ນສຸດທ້າຍແລ້ວ</Note>
          )}

          {changePhase.error && (
            <div className="mt-2">
              <ErrorNote error={changePhase.error} />
            </div>
          )}

          <div className="mt-3">
            <Note>
              ພໍພົ້ນ “ຮ່າງ” ແລ້ວ <b className="text-ink-2">ຖອຍກັບບໍ່ໄດ້</b> — ໄປໜ້າໄດ້ຢ່າງດຽວ
              ແຕ່ຍັງແກ້ເນື້ອຫາໄດ້ຕະຫຼອດ
            </Note>
          </div>
        </CardBody>
      </Card>

      <SubmissionsPanel edition={edition} />

      <Note tone="brand">
        <b>ເປັນຫຍັງຈຶ່ງແຍກສອງກ່ອງ:</b> ປີເກົ່າທີ່ຍ້ອນໃສ່ຂໍ້ມູນຕ້ອງ “ປະກາດຜູ້ຊະນະແລ້ວ”
        ໂດຍ<b>ບໍ່ເຄີຍເປີດຟອມ</b>ເລີຍ — ສອງເລື່ອງນີ້ຈຶ່ງບໍ່ຄວນເປັນປຸ່ມດຽວກັນ
      </Note>

      {nextPhase && (
        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            changePhase.mutate({ phase: nextPhase }, { onSuccess: () => setConfirming(false) })
          }
          pending={changePhase.isPending}
          title={`ໄປຂັ້ນ “${PHASE_LABEL[nextPhase]}”?`}
          description="ຂັ້ນຕອນນີ້ຖອຍກັບບໍ່ໄດ້ ແລະ ຄົນນອກຈະເຫັນຜົນທັນທີ"
          confirmLabel="ດຳເນີນການ"
        />
      )}
    </>
  );
}

function SubmissionsPanel({ edition }: { edition: Edition }) {
  const [closeAt, setCloseAt] = useState(toLocalInput(edition.submissionsCloseAt));

  const setSubmissions = useApiMutation<{ submissionsOpen: boolean; submissionsCloseAt: string | null }>(
    `/admin/editions/${edition.id}/submissions`,
    'PATCH',
    ['/admin/editions', '/admin/dashboard'],
  );

  function save(open: boolean, closeIso: string | null) {
    setSubmissions.mutate({ submissionsOpen: open, submissionsCloseAt: closeIso });
  }

  return (
    <Card>
      <CardHeader title="ສະຫວິດ 2 · ຟອມສົ່ງລາຍຊື່" aside="ແຍກຈາກສະຫວິດ 1" />
      <CardBody>
        <div className="mb-3 flex items-center gap-3">
          <Switch
            checked={edition.submissionsOpen}
            disabled={setSubmissions.isPending}
            label="ເປີດ/ປິດຟອມສົ່ງລາຍຊື່"
            onChange={(next) => save(next, closeAt ? new Date(closeAt).toISOString() : null)}
          />
          <span>
            <span className="block text-[13px] font-semibold text-ink">
              {edition.submissionsOpen ? 'ເປີດຢູ່' : 'ປິດຢູ່'}
            </span>
            <span className="block text-[11.5px] text-ink-3">
              {edition.submissionsOpen ? 'ຄົນນອກສົ່ງລາຍຊື່ໄດ້' : 'ຄົນນອກສົ່ງລາຍຊື່ບໍ່ໄດ້'}
            </span>
          </span>
        </div>

        <Field label="ວັນປິດຮັບອັດຕະໂນມັດ" hint="— ບໍ່ບັງຄັບ">
          <Input
            type="datetime-local"
            value={closeAt}
            onChange={(event) => setCloseAt(event.target.value)}
            onBlur={() =>
              edition.submissionsOpen &&
              save(true, closeAt ? new Date(closeAt).toISOString() : null)
            }
          />
        </Field>

        {setSubmissions.error && <ErrorNote error={setSubmissions.error} />}

        <Note>
          ເປີດຟອມໄດ້ <b className="text-ink-2">ປີດຽວໃນເວລາດຽວ</b> — ເປີດປີນີ້
          ລະບົບຈະປິດປີອື່ນໃຫ້ອັດຕະໂນມັດ ແລະ ບັນທຶກໄວ້ໃນປະຫວັດ
        </Note>
      </CardBody>
    </Card>
  );
}

interface CheckRow {
  label: string;
  detail: string;
  ok: boolean;
  /** Whether failing this one blocks the next phase specifically. */
  blocksNext: boolean;
}

/**
 * Mirrors the server-side checklist in EditionsService so the button disables
 * before the request rather than after a rejection. The server stays the
 * authority — this only saves a round trip and explains what is missing.
 */
function buildChecklist(
  edition: Edition,
  categories: Category[],
  nextPhase: EditionPhase | undefined,
): CheckRow[] {
  const withoutNominees = categories.filter((c) => (c._count?.nominations ?? 0) === 0).length;
  const withoutWinner = categories.filter((c) => (c.nominations?.length ?? 0) === 0).length;

  return [
    {
      label: 'ມີຊື່ງານ ແລະ URL',
      detail: `/awards/${edition.slug}`,
      ok: Boolean(edition.titleLo && edition.slug),
      blocksNext: true,
    },
    {
      label: 'ມີສາຂາຢ່າງໜ້ອຍ 1 ສາຂາ',
      detail: `${categories.length} ສາຂາ`,
      ok: categories.length > 0,
      blocksNext: true,
    },
    {
      label: 'ທຸກສາຂາມີນອມິນີ',
      detail:
        withoutNominees === 0
          ? 'ຄົບແລ້ວ'
          : `ຍັງເຫຼືອ ${withoutNominees} ສາຂາ — ບລັອກຂັ້ນ “ປະກາດນອມິນີ”`,
      ok: withoutNominees === 0,
      blocksNext: nextPhase === 'NOMINEES_ANNOUNCED' || nextPhase === 'WINNERS_ANNOUNCED',
    },
    {
      label: 'ທຸກສາຂາຕິດຜູ້ຊະນະແລ້ວ',
      detail:
        withoutWinner === 0
          ? 'ຄົບແລ້ວ'
          : `ຍັງເຫຼືອ ${withoutWinner} ສາຂາ — ບລັອກຂັ້ນ “ປະກາດຜູ້ຊະນະ”`,
      ok: withoutWinner === 0,
      blocksNext: nextPhase === 'WINNERS_ANNOUNCED',
    },
  ];
}

/** <input type="datetime-local"> wants local wall-clock, not an ISO string. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
