'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input, Textarea } from '@/components/ui/field';
import { GalleryEditor } from '@/components/admin/gallery-editor';
import { ImageUpload } from '@/components/admin/image-upload';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { SiteSettings } from '@/types/api';
import { emptyToNull } from '@/lib/utils';

/**
 * The evergreen content of the homepage (PRD §6.1.1). Nothing here may name a
 * year — anything year-specific belongs on the edition instead.
 */
export default function SitePage() {
  const { data, isLoading, error } = useApi<SiteSettings>('/admin/site');

  const [form, setForm] = useState({ brandStatementLo: '', aboutSummaryLo: '', heroCaptionLo: '' });
  const [heroImageKey, setHeroImageKey] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Seed the form once the settings arrive.
  useEffect(() => {
    if (!data) return;
    setForm({
      brandStatementLo: data.brandStatementLo ?? '',
      aboutSummaryLo: data.aboutSummaryLo ?? '',
      heroCaptionLo: data.heroCaptionLo ?? '',
    });
    setHeroImageKey(data.heroImageKey);
    setGallery(data.galleryImageKeys ?? []);
  }, [data]);

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
                brandStatementLo: form.brandStatementLo,
                aboutSummaryLo: form.aboutSummaryLo,
                heroCaptionLo: emptyToNull(form.heroCaptionLo),
                heroImageKey: heroImageKey ?? null,
                galleryImageKeys: gallery,
              },
              { onSuccess: () => setSaved(true) },
            );
          }}
        >
          <Card>
            <CardHeader title="ຂໍ້ຄວາມໜ້າແຮກ" />
            <CardBody>
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
            <CardHeader title="ຄັງພາບໜ້າແຮກ" aside={`${gallery.length} ຮູບ`} />
            <CardBody>
              <GalleryEditor keys={gallery} onChange={setGallery} folder="site" />
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
