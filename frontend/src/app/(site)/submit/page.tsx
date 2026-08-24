import type { Metadata } from 'next';

import { ActionLink, Section } from '@/components/site/primitives';
import { SubmitForm } from './submit-form';
import { getPublic } from '@/lib/api/server';
import { pageSeo } from '@/lib/page-seo';
import type { SiteSettings } from '@/types/api';
import type { SubmissionForm } from '@/types/public';
import { formatDate } from '@/lib/dates';

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await pageSeo('submit', {
    title: 'ສົ່ງລາຍຊື່',
    description: 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານຄິດວ່າຄູ່ຄວນໄດ້ລາງວັນ',
  });
  return { alternates: { canonical: '/submit' }, title, description };
}

// Whether the form is open can change at any moment from the back office, so
// this page is checked often rather than cached for long.
export const revalidate = 30;

export default async function SubmitPage() {
  const [form, site] = await Promise.all([
    getPublic<SubmissionForm | null>('/submission-form', { revalidate: 30 }),
    getPublic<SiteSettings>('/site'),
  ]);

  // What the team says happens next, one item per line. Falls back to the words
  // the page used to hold, so an emptied field never leaves the box headed but
  // empty.
  const afterSending = (site?.submitAfterLo ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const steps = afterSending.length > 0 ? afterSending : [
    'ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື',
    'ຊື່ທີ່ຖືກສົ່ງຫຼາຍຄັ້ງຈະຖືກລວມເປັນລາຍການດຽວ ບໍ່ນັບເປັນຄະແນນ',
    'ຄະນະກຳມະການເປັນຜູ້ຕັດສິນ ບໍ່ແມ່ນຈຳນວນຄັ້ງທີ່ຖືກສະເໜີ',
  ];

  // Someone who arrives the day after the deadline is not in the same position
  // as someone who arrives before anything has opened, and telling both to wait
  // is wrong for the first (PRD §4.2). Someone who arrives between two editions
  // — the old one long since judged, the new one not yet open — is a third
  // position again: pointing them back at a cycle with nothing left to do
  // with them is worse than pointing them forward.
  if (!form || form.state !== 'open') {
    if (form?.state === 'upcoming') {
      const { edition, previousClosed } = form;
      const previousAnnounced = previousClosed?.phase === 'WINNERS_ANNOUNCED';

      return (
        <Section eyebrow="ສົ່ງລາຍຊື່" title="ຍັງບໍ່ເປີດຮັບ" titleAs="h1">
          <div className="max-w-xl rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-10">
            <p className="text-[15px] leading-relaxed text-ink-2">
              ງານປີ {edition.year} ຍັງບໍ່ໄດ້ເປີດຮັບການສະເໜີຊື່
              {previousClosed &&
                (previousAnnounced ? (
                  <> · ໃນລະຫວ່າງນີ້ ເບິ່ງຜູ້ຊະນະປີ {previousClosed.year} ໄດ້ກ່ອນ</>
                ) : (
                  <> · ປີ {previousClosed.year} ປິດຮັບແລ້ວ ຢູ່ລະຫວ່າງການຄັດກອງ ແລະ ຕັດສິນ</>
                ))}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <ActionLink href={`/awards/${edition.slug}`} tone="quiet">
                ເບິ່ງງານປີ {edition.year}
              </ActionLink>
              {previousClosed && (
                <ActionLink href={`/awards/${previousClosed.slug}`} tone="quiet">
                  {previousAnnounced ? `ເບິ່ງຜູ້ຊະນະປີ ${previousClosed.year}` : `ເບິ່ງງານປີ ${previousClosed.year}`}
                </ActionLink>
              )}
              <ActionLink href="/winners" tone="quiet">
                ທຳນຽບຜູ້ຊະນະ
              </ActionLink>
            </div>
          </div>
        </Section>
      );
    }

    const closed = form?.state === 'closed' ? form : null;
    // Reached only once there is no newer edition to point at instead, so
    // this closed year is always the newest one there is — a second button
    // pointing at "the latest year" would only ever repeat the first.
    const announced = closed?.edition.phase === 'WINNERS_ANNOUNCED';

    return (
      <Section
        eyebrow="ສົ່ງລາຍຊື່"
        title={closed ? (announced ? 'ປະກາດຜົນແລ້ວ' : 'ປິດຮັບແລ້ວ') : 'ຍັງບໍ່ເປີດຮັບ'}
        titleAs="h1"
      >
        <div className="max-w-xl rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-10">
          <p className="text-[15px] leading-relaxed text-ink-2">
            {closed ? (
              announced ? (
                <>ການສະເໜີຊື່ຂອງງານປີ {closed.edition.year} ປິດແລ້ວ ແລະ ປະກາດຜູ້ຊະນະຄົບທຸກສາຂາແລ້ວ</>
              ) : (
                <>
                  ການສະເໜີຊື່ຂອງງານປີ {closed.edition.year} ປິດແລ້ວ
                  {closed.closedAt ? ` ເມື່ອ ${formatDate(closed.closedAt)}` : ''} ·
                  ຕອນນີ້ຢູ່ລະຫວ່າງການຄັດກອງ ແລະ ຕັດສິນ
                </>
              )
            ) : (
              <>
                ຕອນນີ້ຍັງບໍ່ໄດ້ເປີດຮັບການສະເໜີຊື່ · ເມື່ອເປີດແລ້ວປຸ່ມ “ສົ່ງລາຍຊື່”
                ຈະຂຶ້ນຢູ່ເທິງສຸດຂອງທຸກໜ້າ
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {closed && (
              <ActionLink href={`/awards/${closed.edition.slug}`} tone="quiet">
                {announced ? `ເບິ່ງຜູ້ຊະນະປີ ${closed.edition.year}` : `ເບິ່ງງານປີ ${closed.edition.year}`}
              </ActionLink>
            )}
            <ActionLink href="/winners" tone="quiet">
              ທຳນຽບຜູ້ຊະນະ
            </ActionLink>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section
      eyebrow={`ງານປີ ${form.edition.year}`}
      title="ສະເໜີຊື່ຄຣີເອເຕີ"
      titleAs="h1"
      intro="ໃຜກໍສົ່ງໄດ້ ບໍ່ຕ້ອງລົງທະບຽນ · ສົ່ງໄດ້ຫຼາຍຄົນ ຫຼາຍສາຂາ"
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="max-w-2xl">
          <SubmitForm form={form} />
        </div>

        <aside className="rounded-[var(--radius-box)] border border-rule bg-panel-2 p-5 text-[13px] leading-relaxed text-ink-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-3">
            ຫຼັງຈາກສົ່ງແລ້ວ
          </p>
          <ol className="mt-3 space-y-2.5">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          {form.closesAt && (
            <p className="mt-4 border-t border-rule pt-4">
              ປິດຮັບ{' '}
              <b className="text-ink">
                {formatDate(form.closesAt)}
              </b>
            </p>
          )}
        </aside>
      </div>
    </Section>
  );
}
