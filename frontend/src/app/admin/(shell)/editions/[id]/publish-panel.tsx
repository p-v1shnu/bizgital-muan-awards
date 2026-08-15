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
import { fromVientianeInput, toVientianeInput } from '@/lib/dates';
import { useApiMutation } from '@/lib/api/hooks';
import type { Category, Edition, EditionPhase } from '@/types/api';

/**
 * The two switches of PRD §4, side by side but visibly separate — a year that
 * is backfilled has to reach WINNERS_ANNOUNCED without its form ever opening,
 * so these must never read as one control.
 */
export function PublishPanel({
  edition,
  categories,
  judges,
}: {
  edition: Edition;
  categories: Category[];
  judges: number;
}) {
  /**
   * While a year is still a draft the team may set it to whatever it actually
   * is (PRD §4.4 rule 2): backfilling 2023 means choosing "winners announced"
   * once, not walking a finished event forward through three states it was
   * never in. The API has always allowed that jump; only this control did not
   * offer it. After DRAFT the walk is one step at a time and forward only.
   */
  const remaining = PHASE_ORDER.slice(PHASE_ORDER.indexOf(edition.phase) + 1) as EditionPhase[];
  const choices = edition.phase === 'DRAFT' ? remaining : remaining.slice(0, 1);

  const [target, setTarget] = useState<EditionPhase | undefined>(choices[0]);
  const nextPhase = choices.includes(target as EditionPhase) ? target : choices[0];

  const checks = buildChecklist(edition, categories, judges);
  const missing = checks.filter((check) => !check.ok);

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
                  // Quiet, not alarming: nothing on this list stops the phase.
                  <X className="mt-0.5 size-4 shrink-0 text-ink-3" />
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
              {choices.length > 1 && (
                <div className="mb-2">
                  <Field label="ຈະໄປຂັ້ນໃດ" help="ຍັງເປັນ “ຮ່າງ” ຢູ່ ຈຶ່ງເລືອກໄດ້ — ໃຊ້ຕອນຍ້ອນໃສ່ປີເກົ່າ">
                    <select
                      value={nextPhase}
                      onChange={(event) => setTarget(event.target.value as EditionPhase)}
                      className="w-full rounded-[var(--radius-ui-sm)] border border-rule bg-white px-3 py-2 text-[13px] text-ink"
                    >
                      {choices.map((phase) => (
                        <option key={phase} value={phase}>
                          {PHASE_LABEL[phase]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              <Button
                variant="primary"
                className="w-full"
                disabled={changePhase.isPending}
                onClick={() => setConfirming(true)}
              >
                {changePhase.isPending ? 'ກຳລັງດຳເນີນການ…' : `ໄປຂັ້ນ “${PHASE_LABEL[nextPhase]}”`}
              </Button>
              {missing.length > 0 && (
                <p className="mt-2 text-[11.5px] text-ink-3">
                  ຍັງຂາດ {missing.length} ຢ່າງຂ້າງເທິງ — ໄປຕໍ່ໄດ້ ແຕ່ໜ້າປີຈະຍັງບໍ່ຄົບ
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
          description={
            missing.length > 0
              ? `ຂັ້ນຕອນນີ້ຖອຍກັບບໍ່ໄດ້ ແລະ ຄົນນອກຈະເຫັນຜົນທັນທີ · ຍັງຂາດ ${missing.length} ຢ່າງ: ${missing
                  .map((check) => check.label)
                  .join(' · ')}`
              : 'ຂັ້ນຕອນນີ້ຖອຍກັບບໍ່ໄດ້ ແລະ ຄົນນອກຈະເຫັນຜົນທັນທີ'
          }
          confirmLabel="ດຳເນີນການ"
        />
      )}
    </>
  );
}

function SubmissionsPanel({ edition }: { edition: Edition }) {
  const [closeAt, setCloseAt] = useState(toVientianeInput(edition.submissionsCloseAt));

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
            onChange={(next) => save(next, fromVientianeInput(closeAt))}
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

        <Field label="ວັນປິດຮັບອັດຕະໂນມັດ" hint="— ບໍ່ບັງຄັບ · ເວລາລາວ (UTC+7)">
          <Input
            type="datetime-local"
            value={closeAt}
            onChange={(event) => setCloseAt(event.target.value)}
            onBlur={() =>
              edition.submissionsOpen &&
              save(true, fromVientianeInput(closeAt))
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
}

/**
 * The list PRD §4.3.3 asks for, which **warns and does not block**. Four of its
 * five items were missing here and one of the two that were present was not on
 * it at all; what was there stopped the team instead of telling them.
 *
 * Nothing on this list prevents the phase from moving. A backfilled 2023 has no
 * key visual, no venue and no panel, and it still has to reach "winners
 * announced" (PRD §7.5) — a checklist that blocks would make that impossible,
 * which is exactly why the PRD says warn.
 */
function buildChecklist(edition: Edition, categories: Category[], judges: number): CheckRow[] {
  const withoutNominees = categories.filter((c) => (c._count?.nominations ?? 0) === 0).length;
  const withoutWinner = categories.filter((c) => (c.nominations?.length ?? 0) === 0).length;
  const featured = categories.filter((c) => c.isFeatured).length;

  return [
    {
      label: 'ມີຊື່ງານ ແລະ URL',
      detail: `/awards/${edition.slug}`,
      ok: Boolean(edition.titleLo && edition.slug),
    },
    {
      label: 'ມີສາຂາຢ່າງໜ້ອຍ 1 ສາຂາ',
      detail: `${categories.length} ສາຂາ`,
      ok: categories.length > 0,
    },
    {
      label: 'ຕັ້ງສາຂາເດັ່ນ 3–6 ສາຂາ',
      detail:
        featured === 0
          ? 'ຍັງບໍ່ໄດ້ຕັ້ງ — ໜ້າແຮກຈະບໍ່ມີການ໌ດຜູ້ຊະນະ'
          : `${featured} ສາຂາ${featured < 3 || featured > 6 ? ' — ແນະນຳ 3–6' : ''}`,
      ok: featured >= 3 && featured <= 6,
    },
    {
      label: 'ມີວັນທີຈັດງານ ແລະ ສະຖານທີ່',
      detail: [edition.eventDate ? 'ມີວັນທີ' : 'ຍັງບໍ່ມີວັນທີ', edition.venueLo ? 'ມີສະຖານທີ່' : 'ຍັງບໍ່ມີສະຖານທີ່'].join(' · '),
      ok: Boolean(edition.eventDate && edition.venueLo),
    },
    {
      label: 'ມີຮູບ key visual ຂອງປີ',
      detail: edition.heroImageKey ? 'ມີແລ້ວ' : 'ຍັງບໍ່ໄດ້ອັບໂຫລດ — ໜ້າປີຈະບໍ່ມີຮູບ hero',
      ok: Boolean(edition.heroImageKey),
    },
    {
      label: 'ມີຄະນະກຳມະການຢ່າງໜ້ອຍ 1 ທ່ານ',
      detail: judges > 0 ? `${judges} ທ່ານ` : 'ຍັງບໍ່ໄດ້ຕັ້ງ',
      ok: judges > 0,
    },
    {
      label: 'ທຸກສາຂາມີນອມິນີ',
      detail: withoutNominees === 0 ? 'ຄົບແລ້ວ' : `ຍັງເຫຼືອ ${withoutNominees} ສາຂາ`,
      ok: withoutNominees === 0,
    },
    {
      label: 'ທຸກສາຂາຕິດຜູ້ຊະນະແລ້ວ',
      detail: withoutWinner === 0 ? 'ຄົບແລ້ວ' : `ຍັງເຫຼືອ ${withoutWinner} ສາຂາ`,
      ok: withoutWinner === 0,
    },
  ];
}

