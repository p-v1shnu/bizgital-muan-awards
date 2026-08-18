'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EntryListEditor } from '@/components/admin/entry-list-editor';
import { GalleryEditor } from '@/components/admin/gallery-editor';
import { ImageUpload } from '@/components/admin/image-upload';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { FaqItem, HomeCards, JudgingStep, PageSeo, SiteSettings } from '@/types/api';
import { emptyToNull } from '@/lib/utils';

const SOCIALS = ['facebook', 'tiktok', 'youtube', 'instagram'] as const;

/**
 * The evergreen content of the homepage (PRD §6.1.1). Nothing here may name a
 * year — anything year-specific belongs on the edition instead.
 */
export default function SitePage() {
  const { data, isLoading, error } = useApi<SiteSettings>('/admin/site');

  const [form, setForm] = useState({
    heroTitleLo: '',
    brandStatementLo: '',
    aboutTitleLo: '',
    aboutSummaryLo: '',
    aboutHistoryLo: '',
    ctaTitleLo: '',
    ctaBodyLo: '',
    heroCaptionLo: '',
    contactEmail: '',
    contactPhone: '',
    submitAfterLo: '',
    footerLocationLo: '',
  });
  const [heroImageKey, setHeroImageKey] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [steps, setSteps] = useState<JudgingStep[]>([]);
  const [cards, setCards] = useState<HomeCards>({});
  const [seo, setSeo] = useState<Record<string, PageSeo>>({});
  const [saved, setSaved] = useState(false);

  // Seed the form once the settings arrive.
  useEffect(() => {
    if (!data) return;
    setForm({
      heroTitleLo: data.heroTitleLo ?? '',
      brandStatementLo: data.brandStatementLo ?? '',
      aboutTitleLo: data.aboutTitleLo ?? '',
      aboutSummaryLo: data.aboutSummaryLo ?? '',
      aboutHistoryLo: data.aboutHistoryLo ?? '',
      ctaTitleLo: data.ctaTitleLo ?? '',
      ctaBodyLo: data.ctaBodyLo ?? '',
      heroCaptionLo: data.heroCaptionLo ?? '',
      contactEmail: data.contactEmail ?? '',
      contactPhone: data.contactPhone ?? '',
      submitAfterLo: data.submitAfterLo ?? '',
      footerLocationLo: data.footerLocationLo ?? '',
    });
    setHeroImageKey(data.heroImageKey);
    setGallery(data.galleryImageKeys ?? []);
    setSocials(data.socialLinks ?? {});
    setFaq(data.faq ?? []);
    setSteps(data.judgingSteps ?? []);
    setCards(data.homeCards ?? {});
    setSeo(data.pageSeo ?? {});
  }, [data]);

  // The two the page has always been asked and the team alone can answer. They
  // ship as answers now, so this only speaks up if someone removes one.
  const missingStaples = [
    { keyword: 'ຄຸນສົມບັດ', question: 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?' },
    { keyword: 'ຄະນະກຳມະການເລືອກ', question: 'ຄະນະກຳມະການເລືອກມາແນວໃດ?' },
  ]
    .filter(({ keyword }) => !faq.some((item) => item.questionLo.includes(keyword)))
    .map(({ question }) => question);

  const save = useApiMutation<Record<string, unknown>>('/admin/site', 'PUT', ['/admin/site', '/site']);

  if (isLoading) return <LoadingBlock />;

  return (
    <>
      <PageHeader crumbs={[{ label: 'ເນື້ອຫາເວັບສ່ວນກາງ' }]} />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Note tone="brand">
          ສ່ວນນີ້ຄື<b>ເນື້ອຫາທີ່ບໍ່ຜູກກັບປີໃດ</b> — ຖ້າບໍ່ມີໃຜແຕະເວັບເລີຍ 18 ເດືອນ
          ຂໍ້ຄວາມພວກນີ້ຕ້ອງຍັງຖືກຢູ່ · ຂໍ້ມູນຂອງແຕ່ລະປີໃຫ້ໄປໃສ່ໃນໜ້າປີແທນ
        </Note>

        <form
          className="grid items-start gap-4 xl:grid-cols-2"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(false);
            save.mutate(
              {
                heroTitleLo: form.heroTitleLo,
                brandStatementLo: form.brandStatementLo,
                aboutTitleLo: form.aboutTitleLo,
                aboutSummaryLo: form.aboutSummaryLo,
                aboutHistoryLo: emptyToNull(form.aboutHistoryLo),
                ctaTitleLo: form.ctaTitleLo,
                ctaBodyLo: form.ctaBodyLo,
                heroCaptionLo: emptyToNull(form.heroCaptionLo),
                contactEmail: emptyToNull(form.contactEmail),
                contactPhone: emptyToNull(form.contactPhone),
                // An entry the team started and left blank is dropped rather
                // than refused, so a stray empty row cannot block a save.
                faq: faq.filter((item) => item.questionLo.trim() && item.answerLo.trim()),
                judgingSteps: steps.filter((step) => step.titleLo.trim() && step.bodyLo.trim()),
                homeCards: cards,
                submitAfterLo: emptyToNull(form.submitAfterLo),
                pageSeo: seo,
                footerLocationLo: emptyToNull(form.footerLocationLo),
                heroImageKey: heroImageKey ?? null,
                galleryImageKeys: gallery,
                socialLinks: socials,
              },
              { onSuccess: () => setSaved(true) },
            );
          }}
        >
          <Card>
            <CardHeader title="ຂໍ້ຄວາມໜ້າແຮກ" />
            <CardBody>
              <Field label="ຊື່ງານເທິງສຸດຂອງໜ້າແຮກ" help="ຫົວຂໍ້ໃຫຍ່ເທິງຮູບ hero">
                <Input
                  required
                  value={form.heroTitleLo}
                  onChange={(event) => setForm({ ...form, heroTitleLo: event.target.value })}
                />
              </Field>
              <Field
                label="ຂໍ້ຄວາມແບຣນ"
                help="ປະໂຫຍກດຽວໃຕ້ຊື່ງານເທິງສຸດຂອງໜ້າແຮກ"
              >
                <Textarea
                  required
                  value={form.brandStatementLo}
                  onChange={(event) => setForm({ ...form, brandStatementLo: event.target.value })}
                />
              </Field>
              <Field label="ຫົວຂໍ້ສ່ວນ “ເກີ່ຍວກັບງານ”" help="ຫົວຂໍ້ໃຫຍ່ຂອງໜ້າແຮກ ກ່ອນຫຍໍ້ໜ້າແນະນຳງານ">
                <Input
                  required
                  value={form.aboutTitleLo}
                  onChange={(event) => setForm({ ...form, aboutTitleLo: event.target.value })}
                />
              </Field>
              <Field label="ຫຍໍ້ໜ້າແນະນຳງານ" help="ຫຍໍ້ໜ້າສັ້ນໆ ຂຶ້ນໜ້າແຮກ ແລະ ຫົວໜ້າ “ກ່ຽວກັບ”">
                <Textarea
                  required
                  className="min-h-32"
                  value={form.aboutSummaryLo}
                  onChange={(event) => setForm({ ...form, aboutSummaryLo: event.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ຂໍ້ຄວາມ CTA ປິດທ້າຍໜ້າແຮກ" />
            <CardBody>
              <Field label="ຫົວຂໍ້" help="ຫົວຂໍ້ໃຫຍ່ ກ່ອນປຸ່ມ “ສົ່ງລາຍຊື່” ໃນທ້າຍໜ້າແຮກ">
                <Input
                  required
                  value={form.ctaTitleLo}
                  onChange={(event) => setForm({ ...form, ctaTitleLo: event.target.value })}
                />
              </Field>
              <Field label="ຄຳອະທິບາຍ">
                <Textarea
                  required
                  value={form.ctaBodyLo}
                  onChange={(event) => setForm({ ...form, ctaBodyLo: event.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ທີ່ມາຂອງງານ ແລະ ເປົ້າໝາຍ (ໜ້າ /about)" />
            <CardBody>
              <Field
                label="ເນື້ອຫາ"
                hint="— ບໍ່ບັງຄັບ"
                help="ແຍກແຕ່ລະຫຍໍ້ໜ້າດ້ວຍການຂຶ້ນແຖວໃໝ່ — ຖ້າຍັງບໍ່ໃສ່ ໜ້າ /about ຈະໂຊວ໌ຂໍ້ຄວາມລໍຖ້າແທນ"
              >
                <Textarea
                  className="min-h-40"
                  value={form.aboutHistoryLo}
                  onChange={(event) => setForm({ ...form, aboutHistoryLo: event.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ຂັ້ນຕອນການຕັດສິນ (ໜ້າແຮກ + /about)" aside={`${steps.length} ຂັ້ນ`} />
            <CardBody>
              <Note>
                ລາຍການນີ້ຂຶ້ນ<b>ສອງບ່ອນ</b> — ແຖບ “ລາງວັນນີ້ຕັດສິນແນວໃດ” ໃນໜ້າແຮກ ແລະ ຫົວຂໍ້
                “ຂັ້ນຕອນ” ໃນໜ້າ /about · ແກ້ບ່ອນນີ້ບ່ອນດຽວ ປ່ຽນທັງສອງໜ້າພ້ອມກັນ ·
                ໜ້າແຮກມີໄອຄອນໃຫ້ 4 ຂັ້ນທຳອິດ ຂັ້ນທີ່ເພີ່ມມາຈະມີແຕ່ເລກລຳດັບ
              </Note>
              <div className="mt-4">
                <EntryListEditor
                  items={steps}
                  onChange={setSteps}
                  blank={{ titleLo: '', bodyLo: '' }}
                  entryLabel={(position) => `ຂັ້ນ ${position}`}
                  addLabel="ເພີ່ມຂັ້ນຕອນ"
                  removeLabel="ລຶບຂັ້ນຕອນນີ້"
                  fields={[
                    { key: 'titleLo', label: 'ຊື່ຂັ້ນຕອນ', placeholder: 'ຄັດກອງ' },
                    {
                      key: 'bodyLo',
                      label: 'ຄຳອະທິບາຍ',
                      multiline: true,
                      help: 'ສັ້ນໆ 1 ປະໂຫຍກ — ໜ້າແຮກວາງເປັນກາດແຄບ',
                    },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ຂໍ້ຄວາມການ໌ດໃຕ້ hero ໜ້າແຮກ" />
            <CardBody>
              <Note>
                ການ໌ດຊ້າຍປ່ຽນຂໍ້ຄວາມຕາມ<b>ສະຖານະຂອງງານປີປັດຈຸບັນ</b> — ໃສ່ຂໍ້ຄວາມຂອງແຕ່ລະສະຖານະໄວ້
                ລະບົບເລືອກໃຫ້ເອງ · ຊ່ອງໃດເວັ້ນວ່າງ ຈະໃຊ້ຂໍ້ຄວາມມາດຕະຖານຂອງເວັບແທນ ບໍ່ແມ່ນຫວ່າງເປົ່າ ·
                ຄຳວ່າ “ງານປີນີ້” ກັບເລກປີ ລະບົບເຕີມໃຫ້ເອງ
              </Note>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(
                  [
                    ['entriesOpen', 'ຕອນເປີດຮັບເສີນຊື່ (ສຳຄັນສຸດ — ທັບສະຖານະອື່ນ)'],
                    ['published', 'ຕອນເຜີຍແຜ່ປີແລ້ວ ແຕ່ຍັງບໍ່ເປີດຮັບ'],
                    ['nominees', 'ຕອນປະກາດນອມິນີແລ້ວ'],
                    ['winners', 'ຕອນປະກາດຜູ້ຊະນະແລ້ວ'],
                    ['draft', 'ຕອນປີຍັງເປັນຮ່າງ'],
                    ['noYear', 'ຕອນຍັງບໍ່ມີປີໃດເຜີຍແຜ່ເລີຍ'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2/40 p-3">
                    <p className="mb-2 text-[11px] font-semibold text-ink-3">{label}</p>
                    <Field label="ຫົວຂໍ້">
                      <Input
                        value={cards[key]?.titleLo ?? ''}
                        onChange={(event) =>
                          setCards({ ...cards, [key]: { ...cards[key], titleLo: event.target.value } })
                        }
                      />
                    </Field>
                    <Field label="ຄຳອະທິບາຍ">
                      <Textarea
                        value={cards[key]?.bodyLo ?? ''}
                        onChange={(event) =>
                          setCards({ ...cards, [key]: { ...cards[key], bodyLo: event.target.value } })
                        }
                      />
                    </Field>
                  </div>
                ))}

                <div className="rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2/40 p-3">
                  <p className="mb-2 text-[11px] font-semibold text-ink-3">
                    ການ໌ດຂວາ · ທຳນຽບຜູ້ຊະນະ
                  </p>
                  <Field
                    label="ຄຳອະທິບາຍ"
                    help="ຫົວຂໍ້ຂອງການ໌ດນີ້ແກ້ບໍ່ໄດ້ ເພາະເປັນຊື່ໜ້າທີ່ມັນພາໄປ ແລະ ເມນູກັບ footer ກໍໃຊ້ຊື່ນັ້ນ"
                  >
                    <Textarea
                      value={cards.hallOfWinners?.bodyLo ?? ''}
                      onChange={(event) =>
                        setCards({ ...cards, hallOfWinners: { bodyLo: event.target.value } })
                      }
                    />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="“ຫຼັງຈາກສົ່ງແລ້ວ” (ໜ້າ /submit)" />
            <CardBody>
              <Field
                label="ລາຍການ"
                help="ໜຶ່ງແຖວ = ໜຶ່ງຂໍ້ · ຖ້າເວັ້ນວ່າງທັງໝົດ ຈະໃຊ້ຂໍ້ຄວາມມາດຕະຖານຂອງເວັບແທນ"
              >
                <Textarea
                  className="min-h-28"
                  value={form.submitAfterLo}
                  onChange={(event) => setForm({ ...form, submitAfterLo: event.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ຄຳຖາມທີ່ພົບເລື້ອຍ (ໜ້າ /about)" aside={`${faq.length} ຂໍ້`} />
            <CardBody>
              <Note>
                ເພີ່ມ ຫຼື ລຶບຄຳຖາມໄດ້ຕາມໃຈ ແລະ ຈັດລຳດັບດ້ວຍລູກສອນ — ໜ້າ /about ຂຶ້ນຕາມລຳດັບນີ້ ·
                ຂໍ້ໃດເວັ້ນຄຳຖາມ ຫຼື ຄຳຕອບໄວ້ວ່າງ ຂໍ້ນັ້ນຈະບໍ່ຖືກບັນທຶກ
              </Note>
              {missingStaples.length > 0 && (
                <Note tone="brand">
                  ຄຳຖາມທີ່ຄົນຖາມເລື້ອຍແຕ່ຍັງບໍ່ມີໃນລາຍການ — ມີແຕ່ທີມງານທີ່ຕອບໄດ້:{' '}
                  {missingStaples.map((question, index) => (
                    <span key={question}>
                      {index > 0 && ' ແລະ '}
                      <b>{question}</b>
                    </span>
                  ))}
                </Note>
              )}
              <div className="mt-4">
                <EntryListEditor
                  items={faq}
                  onChange={setFaq}
                  blank={{ questionLo: '', answerLo: '' }}
                  entryLabel={(position) => `ຂໍ້ ${position}`}
                  addLabel="ເພີ່ມຄຳຖາມ"
                  removeLabel="ລຶບຄຳຖາມນີ້"
                  fields={[
                    {
                      key: 'questionLo',
                      label: 'ຄຳຖາມ',
                      placeholder: 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?',
                    },
                    {
                      key: 'answerLo',
                      label: 'ຄຳຕອບ',
                      multiline: true,
                      help: 'ແຍກແຕ່ລະຫຍໍ້ໜ້າດ້ວຍການຂຶ້ນແຖວໃໝ່',
                    },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ຊ່ອງທາງຕິດຕໍ່ທີມງານ (ໜ້າ /about)" />
            <CardBody>
              <Field label="ອີເມວ" hint="— ບໍ່ບັງຄັບ">
                <Input
                  type="email"
                  placeholder="info@muanawards.la"
                  value={form.contactEmail}
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                />
              </Field>
              <Field
                label="ເບີໂທ"
                hint="— ບໍ່ບັງຄັບ"
                help="ໃສ່ຫຼາຍເບີໄດ້ — ຖ້າໃສ່ເບີດຽວ ຄົນເປີດຈາກໂທລະສັບຈະກົດໂທໄດ້ເລີຍ"
              >
                <Input
                  placeholder="020 5555 5555"
                  value={form.contactPhone}
                  onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                />
              </Field>
              <Note>
                ຂຶ້ນໃນຫົວຂໍ້ “ຕິດຕໍ່ທີມງານ” ທ້າຍໜ້າ /about — ຊ່ອງໃດເວັ້ນວ່າງ ຊ່ອງທາງນັ້ນຈະບໍ່ຂຶ້ນ
                · ຖ້າເວັ້ນວ່າງທັງສອງ ໜ້ານັ້ນຈະໂຊວ໌ຂໍ້ຄວາມລໍຖ້າແທນ · ເພຈ Facebook ບໍ່ຕ້ອງໃສ່ບ່ອນນີ້
                ໃສ່ໃນ “ລິງກ໌ໂຊຊຽວ” ຂ້າງລຸ່ມ ແລ້ວມັນຂຶ້ນຢູ່ footer ທຸກໜ້າຢູ່ແລ້ວ
              </Note>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ຮູບ hero ໜ້າແຮກ" />
            <CardBody>
              <ImageUpload
                hint="ແນະນຳ 2400 × 1350 px"
                folder="site"
                value={heroImageKey}
                onChange={setHeroImageKey}
              />
              <div className="mt-4">
                <Field label="ຄຳບັນຍາຍໃຕ້ຮູບ" hint="— ບໍ່ບັງຄັບ">
                  <Input
                    value={form.heroCaptionLo}
                    onChange={(event) => setForm({ ...form, heroCaptionLo: event.target.value })}
                  />
                </Field>
              </div>
              <Note>
                ຮູບນີ້ຢູ່ຖາວອນ — ເລືອກຮູບທີ່ໃຊ້ໄດ້ຂ້າມປີ ບໍ່ແມ່ນຮູບງານປີໃດປີໜຶ່ງໂດຍສະເພາະ
              </Note>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ຫົວຂໍ້ ແລະ ຄຳອະທິບາຍໃນ Google (SEO)" />
            <CardBody>
              <Note>
                ນີ້ຄືຂໍ້ຄວາມທີ່ຂຶ້ນໃນ<b>ຜົນຄົ້ນຫາຂອງ Google</b> ແລະ ໃນແທັບຂອງເບົາເຊີ ·
                ຫົວຂໍ້ຢ່າໃຫ້ເກີນ 60 ຕົວ ຄຳອະທິບາຍຢ່າໃຫ້ເກີນ 155 ຕົວ ເກີນກວ່ານັ້ນ Google ຈະຕັດ ·
                ຊ່ອງໃດເວັ້ນວ່າງ ຈະໃຊ້ຂໍ້ຄວາມມາດຕະຖານຂອງໜ້ານັ້ນແທນ — ບໍ່ມີວັນຫວ່າງເປົ່າ ·
                ໜ້າຂອງແຕ່ລະປີ, ສາຂາ ແລະ ຄຣີເອເຕີ ສ້າງເອງຈາກຂໍ້ມູນຂອງມັນ ຈຶ່ງບໍ່ມີຢູ່ນີ້
              </Note>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(
                  [
                    ['home', 'ໜ້າແຮກ (/)'],
                    ['about', 'ໜ້າ ກ່ຽວກັບງານ (/about)'],
                    ['submit', 'ໜ້າ ສົ່ງລາຍຊື່ (/submit)'],
                    ['winners', 'ໜ້າ ທຳນຽບຜູ້ຊະນະ (/winners)'],
                  ] as const
                ).map(([key, label]) => {
                  const title = seo[key]?.titleLo ?? '';
                  const description = seo[key]?.descriptionLo ?? '';
                  return (
                    <div
                      key={key}
                      className="rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2/40 p-3"
                    >
                      <p className="mb-2 text-[11px] font-semibold text-ink-3">{label}</p>
                      <Field
                        label="ຫົວຂໍ້"
                        hint={title.length > 60 ? `— ${title.length}/60 ຍາວເກີນ` : `— ${title.length}/60`}
                      >
                        <Input
                          value={title}
                          onChange={(event) =>
                            setSeo({ ...seo, [key]: { ...seo[key], titleLo: event.target.value } })
                          }
                        />
                      </Field>
                      <Field
                        label="ຄຳອະທິບາຍ"
                        hint={
                          description.length > 155
                            ? `— ${description.length}/155 ຍາວເກີນ`
                            : `— ${description.length}/155`
                        }
                      >
                        <Textarea
                          value={description}
                          onChange={(event) =>
                            setSeo({
                              ...seo,
                              [key]: { ...seo[key], descriptionLo: event.target.value },
                            })
                          }
                        />
                      </Field>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ແຖບລຸ່ມສຸດຂອງທຸກໜ້າ (footer)" />
            <CardBody>
              <Field
                label="ທີ່ຢູ່ / ສະຖານທີ່"
                hint="— ບໍ່ບັງຄັບ"
                help="ຂຶ້ນຢູ່ຂ້າງ © ໃນທຸກໜ້າ · ຖ້າເວັ້ນວ່າງ ຈະໃຊ້ຂໍ້ຄວາມມາດຕະຖານແທນ"
              >
                <Input
                  value={form.footerLocationLo}
                  onChange={(event) => setForm({ ...form, footerLocationLo: event.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ຄັງພາບໜ້າແຮກ" aside={`${gallery.length} ຮູບ`} />
            <CardBody>
              <GalleryEditor keys={gallery} onChange={setGallery} folder="site" />
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="ລິງກ໌ໂຊຊຽວ" />
            <CardBody>
              <Note>ຂຶ້ນເປັນໄອຄອນໃນ footer — ຊ່ອງໃດເວັ້ນວ່າງ ໄອຄອນນັ້ນຈະບໍ່ຂຶ້ນ</Note>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
            </CardBody>
          </Card>

          <div className="flex items-center gap-3 xl:col-span-2">
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
            </Button>
            {saved && !save.isPending && <span className="text-[13px] text-ok">ບັນທຶກແລ້ວ</span>}
            {save.error && <ErrorNote error={save.error} />}
          </div>
        </form>
      </PageBody>
    </>
  );
}
