import type { Metadata } from 'next';

import { ActionLink, Section } from '@/components/site/primitives';
import { SubmitForm } from './submit-form';
import { getPublic } from '@/lib/api/server';
import type { SubmissionForm } from '@/types/public';
import { formatDate } from '@/lib/dates';

export const metadata: Metadata = {
  title: 'ສົ່ງລາຍຊື່',
  description: 'ເສີນຊື່ຜູ້ສ້າງສັນຄອນເທັນລາວທີ່ທ່ານຄິດວ່າຄູ່ຄວນໄດ້ລາງວັນ',
};

// Whether the form is open can change at any moment from the back office, so
// this page is checked often rather than cached for long.
export const revalidate = 30;

export default async function SubmitPage() {
  const form = await getPublic<SubmissionForm | null>('/submission-form', { revalidate: 30 });

  if (!form) {
    return (
      <Section eyebrow="ສົ່ງລາຍຊື່" title="ຍັງບໍ່ເປີດຮັບ" titleAs="h1">
        <div className="max-w-xl rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-10">
          <p className="text-[15px] leading-relaxed text-ink-2">
            ຕອນນີ້ຍັງບໍ່ໄດ້ເປີດຮັບການເສີນຊື່ · ເມື່ອເປີດແລ້ວປຸ່ມ “ສົ່ງລາຍຊື່”
            ຈະຂຶ້ນຢູ່ເທິງສຸດຂອງທຸກໜ້າ
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ActionLink href="/awards/latest" tone="quiet">
              ເບິ່ງງານປີລ່າສຸດ
            </ActionLink>
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
      title="ເສີນຊື່ຜູ້ສ້າງສັນ"
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
            <li>ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື</li>
            <li>ຊື່ທີ່ຖືກສົ່ງຫຼາຍຄັ້ງຈະຖືກລວມເປັນລາຍການດຽວ ບໍ່ນັບເປັນຄະແນນ</li>
            <li>ຄະນະກຳມະການເປັນຜູ້ຕັດສິນ ບໍ່ແມ່ນຈຳນວນຄັ້ງທີ່ຖືກເສີນ</li>
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
