import type { Metadata } from 'next';

import { ActionLink, Placeholder, Section } from '@/components/site/primitives';
import { getPublic } from '@/lib/api/server';
import type { SiteSettings } from '@/types/api';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: 'ກ່ຽວກັບງານ',
  description: 'ທີ່ມາຂອງມ່ວນ ອະວອດ, ເກນການຕັດສິນ ແລະ ຄຳຖາມທີ່ພົບເລື້ອຍ',
};

/**
 * The one page whose copy is written rather than entered in the back office.
 * Anything still marked as a placeholder is waiting on the content team; the
 * markers are meant to be obvious so none of them reaches production unnoticed.
 */
const FAQ: { q: string; a: string; placeholder?: boolean }[] = [
  {
    q: 'ໃຜສາມາດເສີນຊື່ໄດ້?',
    a: 'ທຸກຄົນ — ບໍ່ຕ້ອງລົງທະບຽນ ແລະ ບໍ່ຕ້ອງບອກຊື່ຜູ້ສົ່ງ',
  },
  {
    q: 'ຈຳນວນຄັ້ງທີ່ຖືກເສີນ ມີຜົນຕໍ່ຜົນລາງວັນບໍ?',
    a: 'ບໍ່ມີ — ການເສີນຊື່ຊ່ວຍໃຫ້ທີມງານບໍ່ເບິ່ງຂ້າມໃຜ ແຕ່ຜູ້ຕັດສິນຄືຄະນະກຳມະການ',
  },
  {
    q: 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?',
    a: 'ລໍຖ້າຂໍ້ຄວາມຈາກທີມງານ',
    placeholder: true,
  },
  {
    q: 'ຄະນະກຳມະການເລືອກມາແນວໃດ?',
    a: 'ລໍຖ້າຂໍ້ຄວາມຈາກທີມງານ',
    placeholder: true,
  },
  {
    q: 'ຢາກຮ່ວມເປັນສະປອນເຊີ ຕິດຕໍ່ໃສ?',
    a: 'ລໍຖ້າຊ່ອງທາງຕິດຕໍ່ຈາກທີມງານ',
    placeholder: true,
  },
];

export default async function AboutPage() {
  const site = await getPublic<SiteSettings>('/site');

  return (
    <>
      <Section eyebrow="ກ່ຽວກັບງານ" title="ມ່ວນ ອະວອດ" titleAs="h1">
        <p className="max-w-2xl text-[15.5px] leading-[1.9] text-ink-2">
          {site?.aboutSummaryLo || (
            <Placeholder>ຫຍໍ້ໜ້າແນະນຳງານ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
          )}
        </p>
        <p className="mt-4 max-w-2xl text-[15px] leading-[1.9] text-ink-3">
          <Placeholder>ທີ່ມາຂອງງານ ແລະ ເປົ້າໝາຍ — ລໍຖ້າຂໍ້ຄວາມຈາກທີມງານ</Placeholder>
        </p>
      </Section>

      <Section id="judging" eyebrow="ວິທີການຕັດສິນ" title="ຂັ້ນຕອນ" className="bg-panel-2/50">
        <ol className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'ເສີນຊື່', body: 'ເປີດໃຫ້ທຸກຄົນສົ່ງຊື່ຜ່ານໜ້າ “ສົ່ງລາຍຊື່”' },
            { title: 'ຄັດກອງ', body: 'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີ ແລ້ວສະຫຼຸບເປັນລາຍຊື່ນອມິນີ' },
            { title: 'ກຳມະການລົງຄະແນນ', body: 'ຄະນະກຳມະການຂອງປີນັ້ນລົງຄະແນນເປັນເອກະລາດ' },
            { title: 'ປະກາດຜົນ', body: 'ປະກາດນອມິນີກ່ອນ ແລ້ວປະກາດຜູ້ຊະນະໃນງານ' },
          ].map((step, index) => (
            <li key={step.title} className="rounded-[var(--radius-box)] border border-rule bg-panel p-5">
              <p className="font-serif text-xl text-ink">
                <span className="mr-2 text-ink-3">{index + 1}.</span>
                {step.title}
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="faq" eyebrow="ຄຳຖາມທີ່ພົບເລື້ອຍ" title="FAQ">
        <div className="max-w-3xl overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel">
          {FAQ.map((item) => (
            <details key={item.q} className="border-b border-hairline last:border-b-0">
              <summary className="cursor-pointer list-none px-5 py-4 font-serif text-[19px] text-ink">
                {item.q}
              </summary>
              <p className="px-5 pb-4 text-[14px] leading-relaxed text-ink-2">
                {item.placeholder ? <Placeholder>{item.a}</Placeholder> : item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* The form asks for a name and an email, so the page has to say what
          happens to them. Written as plainly as the rest of the site. */}
      <Section id="privacy" eyebrow="ຄວາມເປັນສ່ວນຕົວ" title="ຂໍ້ມູນຂອງທ່ານ" className="bg-panel-2/50">
        <div className="max-w-3xl space-y-6 text-[14.5px] leading-[1.85] text-ink-2">
          <div>
            <h3 className="font-serif text-[19px] text-ink">ຕອນສົ່ງລາຍຊື່ ເຮົາເກັບຫຍັງແດ່</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <b className="text-ink">ຊື່ຜູ້ສ້າງສັນ, ສາຂາ, ລິງກ໌ ແລະ ເຫດຜົນ</b> ທີ່ທ່ານພິມມາ —
                ທີມງານໃຊ້ຄັດເລືອກນອມິນີ
              </li>
              <li>
                <b className="text-ink">ຊື່ ແລະ ອີເມວຂອງທ່ານ</b> —{' '}
                <b className="text-ink">ບໍ່ບັງຄັບ</b> ບໍ່ໃສ່ກໍສົ່ງໄດ້ປົກກະຕິ
                ໃຊ້ສະເພາະເມື່ອທີມງານຕ້ອງຖາມກັບເທົ່ານັ້ນ
              </li>
              <li>
                <b className="text-ink">ຮ່ອງຮອຍທາງເທັກນິກ</b> ເພື່ອກັນສະແປມ —
                ທີ່ຢູ່ IP ຖືກ<b className="text-ink">ປ່ຽນເປັນລະຫັດຫຍໍ້</b> ກ່ອນບັນທຶກ
                ຈຶ່ງອ່ານກັບເປັນເລກເດີມບໍ່ໄດ້
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-[19px] text-ink">ເກັບໄວ້ດົນປານໃດ</h3>
            <p className="mt-2">
              ຊື່ ແລະ ອີເມວຂອງຜູ້ສົ່ງຖືກລຶບອອກ <b className="text-ink">ພາຍໃນ 12 ເດືອນ</b>{' '}
              ຫຼັງງານປີນັ້ນຈົບ · ສ່ວນຊື່ຜູ້ສ້າງສັນ ແລະ ຜົນລາງວັນ ເປັນບັນທຶກຂອງງານ ຈຶ່ງເກັບຖາວອນ
            </p>
          </div>

          <div>
            <h3 className="font-serif text-[19px] text-ink">ເຮົາບໍ່ເຮັດຫຍັງກັບຂໍ້ມູນຂອງທ່ານ</h3>
            <p className="mt-2">
              ບໍ່ຂາຍ ບໍ່ແລກປ່ຽນ ແລະ ບໍ່ສົ່ງອີເມວໂຄສະນາ ·
              ຄົນທີ່ເຫັນຂໍ້ມູນຜູ້ສົ່ງມີສະເພາະທີມງານທີ່ມີບັນຊີຫຼັງບ້ານ
              ແລະ ທຸກຄັ້ງທີ່ມີການແກ້ໄຂຖືກບັນທຶກໄວ້
            </p>
          </div>

          <div>
            <h3 className="font-serif text-[19px] text-ink">ສະຖິຕິການເຂົ້າຊົມ</h3>
            <p className="mt-2">
              ເວັບໃຊ້ Google Analytics ເພື່ອນັບຈຳນວນຜູ້ເຂົ້າຊົມ ·
              ຈະເລີ່ມເກັບ<b className="text-ink">ຕໍ່ເມື່ອທ່ານກົດຍອມຮັບ</b>ເທົ່ານັ້ນ
              ປະຕິເສດແລ້ວເວັບຍັງໃຊ້ໄດ້ຄົບທຸກຢ່າງ
            </p>
          </div>

          <div>
            <h3 className="font-serif text-[19px] text-ink">ຢາກໃຫ້ລຶບຂໍ້ມູນ</h3>
            <p className="mt-2">
              ຂຽນມາຫາທີມງານຕາມຊ່ອງທາງຂ້າງລຸ່ມ ພ້ອມບອກຊື່ທີ່ທ່ານສົ່ງເຂົ້າມາ —
              ເຮົາຈະລຶບຂໍ້ມູນຜູ້ສົ່ງອອກໃຫ້
            </p>
          </div>
        </div>
      </Section>

      <Section id="contact" eyebrow="ຕິດຕໍ່" title="ຕິດຕໍ່ທີມງານ" className="pb-20">
        <div
          id="sponsor"
          className="max-w-2xl rounded-[var(--radius-box)] border border-rule bg-panel p-6"
        >
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            <Placeholder>ອີເມວ / ເບີໂທ / ເພຈ Facebook — ລໍຖ້າຂໍ້ມູນຈາກທີມງານ</Placeholder>
          </p>
          <div className="mt-5">
            <ActionLink href="/submit" tone="quiet">
              ສົ່ງລາຍຊື່
            </ActionLink>
          </div>
        </div>
      </Section>
    </>
  );
}
