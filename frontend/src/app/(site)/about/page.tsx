import type { Metadata } from 'next';
import { Mail, Phone } from 'lucide-react';

import { ActionLink, Placeholder, Section } from '@/components/site/primitives';
import { PolicyText } from '@/components/site/policy-text';
import { cn } from '@/lib/utils';
import { getPublic } from '@/lib/api/server';
import { pageSeo } from '@/lib/page-seo';
import type { PrivacyBlock, SiteSettings } from '@/types/api';

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await pageSeo('about', {
    title: 'ກ່ຽວກັບງານ',
    description: 'ທີ່ມາຂອງມ່ວນ ອະວອດ, ເກນການຕັດສິນ ແລະ ຄຳຖາມທີ່ພົບເລື້ອຍ',
  });
  return { alternates: { canonical: '/about' }, title, description };
}

/**
 * Every sentence on this page is the team's to change from /admin/site — the
 * summary, the history, the judging steps, the FAQ, the privacy policy and the
 * contact details. What is left in code here is the page's furniture: section
 * headings, the labels beside an e-mail and a phone number, and the note about
 * turning analytics off, which is about how the site behaves rather than what
 * the team promises.
 *
 * The placeholders that remain mark fields nobody has filled in yet, and say
 * where to fill them.
 */

/**
 * The words the privacy section carried before it became a field, kept as the
 * fallback so an emptied list never leaves the section headed and blank. Every
 * database that existed before migration 21 was given exactly these, and a
 * fresh install is seeded with them.
 */
const FALLBACK_PRIVACY: PrivacyBlock[] = [
  {
    titleLo: 'ຕອນສົ່ງລາຍຊື່ ເຮົາເກັບຫຍັງແດ່',
    bodyLo: [
      '- *ຊື່ຜູ້ສ້າງສັນ, ສາຂາ, ລິງກ໌ ແລະ ເຫດຜົນ* ທີ່ທ່ານພິມມາ — ທີມງານໃຊ້ຄັດເລືອກນອມິນີ',
      '- *ຊື່ ແລະ ອີເມວຂອງທ່ານ* — *ບໍ່ບັງຄັບ* ບໍ່ໃສ່ກໍສົ່ງໄດ້ປົກກະຕິ ໃຊ້ສະເພາະເມື່ອທີມງານຕ້ອງຖາມກັບເທົ່ານັ້ນ',
      '- *ຮ່ອງຮອຍທາງເທັກນິກ* ເພື່ອກັນສະແປມ — ທີ່ຢູ່ IP ຖືກ *ປ່ຽນເປັນລະຫັດຫຍໍ້* ກ່ອນບັນທຶກ ຈຶ່ງອ່ານກັບເປັນເລກເດີມບໍ່ໄດ້',
    ].join('\n'),
  },
  {
    titleLo: 'ເກັບໄວ້ດົນປານໃດ',
    bodyLo:
      'ຊື່ ແລະ ອີເມວຂອງຜູ້ສົ່ງຖືກລຶບອອກ *ພາຍໃນ 12 ເດືອນ* ຫຼັງງານປີນັ້ນຈົບ · ສ່ວນຊື່ຜູ້ສ້າງສັນ ແລະ ຜົນລາງວັນ ເປັນບັນທຶກຂອງງານ ຈຶ່ງເກັບຖາວອນ',
  },
  {
    titleLo: 'ເຮົາບໍ່ເຮັດຫຍັງກັບຂໍ້ມູນຂອງທ່ານ',
    bodyLo:
      'ບໍ່ຂາຍ ບໍ່ແລກປ່ຽນ ແລະ ບໍ່ສົ່ງອີເມວໂຄສະນາ · ຄົນທີ່ເຫັນຂໍ້ມູນຜູ້ສົ່ງມີສະເພາະທີມງານທີ່ມີບັນຊີຫຼັງບ້ານ ແລະ ທຸກຄັ້ງທີ່ມີການແກ້ໄຂຖືກບັນທຶກໄວ້',
  },
  {
    titleLo: 'ສະຖິຕິການເຂົ້າຊົມ',
    bodyLo: [
      'ເວັບໃຊ້ *Google Analytics* ນັບຈຳນວນຜູ້ເຂົ້າຊົມ ແລະ ເບິ່ງວ່າໜ້າໃດຖືກເປີດຫຼາຍ · ເລີ່ມນັບ *ຕັ້ງແຕ່ທ່ານເປີດໜ້າ*',
      '',
      'ສິ່ງທີ່ຖືກນັບແມ່ນ *ໜ້າທີ່ເປີດ, ຊະນິດອຸປະກອນ, ພາສາ ແລະ ປະເທດໂດຍປະມານ* — *ບໍ່ແມ່ນຊື່ ຫຼື ອີເມວຂອງທ່ານ* ແລະ Google ບໍ່ໄດ້ບັນທຶກທີ່ຢູ່ IP ໄວ້ໃນລາຍງານ',
    ].join('\n'),
  },
  {
    titleLo: 'ຢາກໃຫ້ລຶບຂໍ້ມູນ',
    bodyLo:
      'ຂຽນມາຫາທີມງານຕາມຊ່ອງທາງຂ້າງລຸ່ມ ພ້ອມບອກຊື່ທີ່ທ່ານສົ່ງເຂົ້າມາ — ເຮົາຈະລຶບຂໍ້ມູນຜູ້ສົ່ງອອກໃຫ້',
  },
];

/** Set only where analytics is actually configured — see the note it guards. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * One way to reach the team. Same shape as the entry cards under the homepage
 * hero — brand-soft icon, eyebrow, then the value itself in the serif — rather
 * than a bare label-and-value row, which is what this section used to be.
 *
 * Renders as a link when there is something to open and as a plain panel when
 * there is not: a phone field holding two numbers cannot become one tel:.
 */
function Channel({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-brand-edge bg-brand-soft text-brand-deep">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-3">
          {label}
        </span>
        <span
          className="mt-1 block break-words font-serif text-[19px] leading-snug text-ink"
          dir="ltr"
        >
          {value}
        </span>
      </span>
    </>
  );

  const shell =
    'flex min-w-[240px] flex-1 items-center gap-4 rounded-[var(--radius-box)] border border-rule bg-panel p-5';

  return href ? (
    <a href={href} className={cn(shell, 'transition-colors hover:border-ink-3')}>
      {inner}
    </a>
  ) : (
    <div className={shell}>{inner}</div>
  );
}
/** One paragraph per line, as it is typed in the back office. */
function paragraphs(value: string | null | undefined) {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function AboutPage() {
  const site = await getPublic<SiteSettings>('/site');
  const history = paragraphs(site?.aboutHistoryLo);
  // An emptied list falls back to the words this section has always carried,
  // rather than to a heading with nothing under it.
  const privacy = site?.privacyBlocks?.length ? site.privacyBlocks : FALLBACK_PRIVACY;

  // How to reach the team: an address and a number. The team's Facebook page is
  // not repeated here — the footer already carries it on every page.
  const email = site?.contactEmail?.trim() || null;
  const phone = site?.contactPhone?.trim() || null;
  // One number is dialable; "020 … / 021 …" is not, and a tel: link holding
  // both would silently dial neither, so that case stays as plain text.
  const dialable = phone != null && /^[\d\s+\-().]+$/.test(phone);
  // Questions and answers both, in the order the team put them in.
  const faq = site?.faq ?? [];
  const judgingSteps = site?.judgingSteps ?? [];

  return (
    <>
      <Section eyebrow="ກ່ຽວກັບງານ" title="ມ່ວນ ອະວອດ" titleAs="h1">
        <p className="max-w-2xl text-[15.5px] leading-[1.9] text-ink-2">
          {site?.aboutSummaryLo || (
            <Placeholder>ຫຍໍ້ໜ້າແນະນຳງານ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
          )}
        </p>
        {history.length > 0 ? (
          <div className="mt-4 max-w-2xl space-y-3 text-[15px] leading-[1.9] text-ink-3">
            {history.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.9] text-ink-3">
            <Placeholder>ທີ່ມາຂອງງານ ແລະ ເປົ້າໝາຍ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
          </p>
        )}
      </Section>

      {/* The homepage renders this same list — one set of words for the two
          pages, which is how they stop describing the process differently. */}
      <Section id="judging" eyebrow="ວິທີການຕັດສິນ" title="ຂັ້ນຕອນ" className="bg-panel-2/50">
        {judgingSteps.length > 0 ? (
          <ol className="grid gap-4 md:grid-cols-2">
            {judgingSteps.map((step, index) => (
              <li
                key={`${index}-${step.titleLo}`}
                className="rounded-[var(--radius-box)] border border-rule bg-panel p-5"
              >
                <p className="font-serif text-xl text-ink">
                  <span className="mr-2 text-ink-3">{index + 1}.</span>
                  {step.titleLo}
                </p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{step.bodyLo}</p>
              </li>
            ))}
          </ol>
        ) : (
          <Placeholder>ຂັ້ນຕອນການຕັດສິນ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
        )}
      </Section>

      <Section id="faq" eyebrow="ຄຳຖາມທີ່ພົບເລື້ອຍ" title="FAQ">
        {faq.length > 0 ? (
          <div className="max-w-3xl overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel">
            {faq.map((item, position) => (
              <details
                key={`${position}-${item.questionLo}`}
                className="border-b border-hairline last:border-b-0"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-serif text-[19px] text-ink">
                  {item.questionLo}
                </summary>
                <div className="space-y-2 px-5 pb-4 text-[14px] leading-relaxed text-ink-2">
                  {paragraphs(item.answerLo).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            <Placeholder>ຍັງບໍ່ມີຄຳຖາມ — ເພີ່ມໄດ້ໃນ /admin/site</Placeholder>
          </p>
        )}
      </Section>

      {/*
        Policy, so the team owns the words: SiteSetting.privacyBlocks. What is
        collected, how long submitter details are kept and what is never done
        with them all used to be written here, which made "deleted within 12
        months" a promise only a deploy could change.

        The opt-out line below is not policy — it is an instruction about how
        this site behaves, and it only makes sense while analytics is running,
        so it is in code and appears only when GA is configured.
      */}
      <Section id="privacy" eyebrow="ຄວາມເປັນສ່ວນຕົວ" title="ຂໍ້ມູນຂອງທ່ານ" className="bg-panel-2/50">
        <div className="max-w-3xl space-y-6 text-[14.5px] leading-[1.85] text-ink-2">
          {privacy.map((block) => (
            <div key={block.titleLo}>
              <h3 className="font-serif text-[19px] text-ink">{block.titleLo}</h3>
              <PolicyText body={block.bodyLo} />
            </div>
          ))}

          {GA_ID && (
            <p className="text-[13.5px] text-ink-3">
              ບໍ່ຢາກຖືກນັບ: ເປີດໂໝດ “ບໍ່ຕິດຕາມ” ຫຼື ບລັອກຄຸກກີໃນເບົາເຊີ ຫຼື ຕິດຕັ້ງ{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noreferrer"
                className="text-brand-deep underline"
              >
                ສ່ວນເສີມປິດ Google Analytics
              </a>{' '}
              — ເວັບຍັງໃຊ້ໄດ້ຄົບທຸກຢ່າງ
            </p>
          )}
        </div>
      </Section>

      <Section id="contact" eyebrow="ຕິດຕໍ່" title="ຕິດຕໍ່ທີມງານ" className="pb-20">
        <div id="sponsor" className="max-w-3xl">
          {email != null || phone != null ? (
            <div className="flex flex-wrap gap-4">
              {email != null && (
                <Channel icon={Mail} label="ອີເມວ" value={email} href={`mailto:${email}`} />
              )}
              {phone != null && (
                <Channel
                  icon={Phone}
                  label="ເບີໂທ"
                  value={phone}
                  href={dialable ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined}
                />
              )}
            </div>
          ) : (
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              <Placeholder>ອີເມວ / ເບີໂທ — ຕັ້ງໄດ້ໃນ /admin/site</Placeholder>
            </p>
          )}
          <p className="mt-6 text-[14.5px] leading-relaxed text-ink-2">
            ຢາກເສີນຊື່ຜູ້ສ້າງສັນ? ບໍ່ຕ້ອງຕິດຕໍ່ທີມງານ ສົ່ງຜ່ານຟອມໄດ້ເລີຍ
          </p>
          <div className="mt-4">
            <ActionLink href="/submit" tone="quiet">
              ສົ່ງລາຍຊື່
            </ActionLink>
          </div>
        </div>
      </Section>
    </>
  );
}
