'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ErrorNote, Note } from '@/components/ui/feedback';
import { Field, Input, Textarea } from '@/components/ui/field';
import { GalleryEditor } from '@/components/admin/gallery-editor';
import { ImageUpload } from '@/components/admin/image-upload';
import { imageKeyList } from '@/lib/images';
import { useApiMutation } from '@/lib/api/hooks';
import type { Edition } from '@/types/api';
import { emptyToNull } from '@/lib/utils';

/** Everything about the event itself. The two switches live in the right rail. */
export function DetailsTab({ edition }: { edition: Edition }) {
  const [form, setForm] = useState({
    year: String(edition.year),
    slug: edition.slug,
    titleLo: edition.titleLo,
    descriptionLo: edition.descriptionLo ?? '',
    eventDate: edition.eventDate ? edition.eventDate.slice(0, 10) : '',
    venueLo: edition.venueLo ?? '',
    activitiesLo: edition.activitiesLo ?? '',
    ticketUrl: edition.ticketUrl ?? '',
    voteUrl: edition.voteUrl ?? '',
  });
  const [heroImageKey, setHeroImageKey] = useState(edition.heroImageKey);
  const [gallery, setGallery] = useState<string[]>(imageKeyList(edition.galleryImageKeys));
  const [saved, setSaved] = useState(false);

  const save = useApiMutation<Record<string, unknown>>(`/admin/editions/${edition.id}`, 'PATCH', [
    '/admin/editions',
    '/admin/dashboard',
  ]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    save.mutate(
      {
        year: Number(form.year),
        slug: form.slug,
        titleLo: form.titleLo,
        // Empty text fields clear the value rather than saving "".
        descriptionLo: emptyToNull(form.descriptionLo),
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
        venueLo: emptyToNull(form.venueLo),
        activitiesLo: emptyToNull(form.activitiesLo),
        ticketUrl: emptyToNull(form.ticketUrl),
        voteUrl: emptyToNull(form.voteUrl),
        heroImageKey: heroImageKey ?? null,
        galleryImageKeys: gallery,
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Card>
        <CardHeader title="ຂໍ້ມູນພື້ນຖານ" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ປີ">
              <Input
                type="number"
                value={form.year}
                onChange={(event) => setForm({ ...form, year: event.target.value })}
              />
            </Field>
            <Field label="URL ຂອງໜ້າ" help={`/awards/${form.slug || '…'}`}>
              <Input
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </Field>
          </div>

          <Field label="ຊື່ງານ (ລາວ)">
            <Input
              className="font-serif text-[15px]"
              value={form.titleLo}
              onChange={(event) => setForm({ ...form, titleLo: event.target.value })}
            />
          </Field>

          <Field label="ຄຳອະທິບາຍ" hint="— ຂຶ້ນເທິງໜ້າປີ ແລະ ໃນ OG tag ຕອນແຊຣ໌">
            <Textarea
              placeholder="ຂຽນສັ້ນໆ 1–2 ປະໂຫຍກ…"
              value={form.descriptionLo}
              onChange={(event) => setForm({ ...form, descriptionLo: event.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ວັນທີຈັດງານ" hint="— ບໍ່ບັງຄັບ">
              <Input
                type="date"
                value={form.eventDate}
                onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
              />
            </Field>
            <Field label="ສະຖານທີ່" hint="— ບໍ່ບັງຄັບ">
              <Input
                placeholder="ຍັງບໍ່ກຳນົດ"
                value={form.venueLo}
                onChange={(event) => setForm({ ...form, venueLo: event.target.value })}
              />
            </Field>
          </div>

          <Field
            label="ກິດຈະກຳໃນງານ"
            hint="— ບໍ່ບັງຄັບ"
            help="ບັນທັດລະ 1 ກິດຈະກຳ ເຊັ່ນ ຍ່າງພົມແດງ · ການສະແດງ · ປະກາດຜົນ — ຈະຂຶ້ນເປັນລາຍການເທິງໜ້າປີ"
          >
            <Textarea
              rows={5}
              placeholder={'ຍ່າງພົມແດງ\nການສະແດງເປີດງານ\nປະກາດຜົນລາງວັນ'}
              value={form.activitiesLo}
              onChange={(event) => setForm({ ...form, activitiesLo: event.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="ລິງກ໌ພາຍນອກ" aside="ປຸ່ມຈະຂຶ້ນສະເພາະເມື່ອໃສ່ລິງກ໌" />
        <CardBody>
          <Field
            label="ລິງກ໌ຊື້ບັດ"
            help="ຂາຍບັດຢູ່ເວັບອື່ນ — ໃສ່ແລ້ວປຸ່ມ “ຊື້ບັດ” ຈະຂຶ້ນເທິງໜ້າປີ"
          >
            <Input
              type="url"
              placeholder="https://…"
              value={form.ticketUrl}
              onChange={(event) => setForm({ ...form, ticketUrl: event.target.value })}
            />
          </Field>
          <Field
            label="ລິງກ໌ລະບົບໂຫວດ"
            help="ໂຫວດຢູ່ເວັບອື່ນເຊັ່ນກັນ — ເວັບນີ້ພຽງແຕ່ສົ່ງຄົນອອກໄປ"
          >
            <Input
              type="url"
              placeholder="https://…"
              value={form.voteUrl}
              onChange={(event) => setForm({ ...form, voteUrl: event.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="ຮູບພາບ" />
        <CardBody>
          <ImageUpload
            label="ຮູບ hero ຂອງປີ"
            hint="ແນະນຳ 2400 × 1350 px"
            folder="editions"
            value={heroImageKey}
            onChange={setHeroImageKey}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="ພາບບັນຍາກາດຫຼັງຈົບງານ"
          aside={gallery.length ? `${gallery.length} ຮູບ` : 'ຍັງບໍ່ມີຮູບ'}
        />
        <CardBody>
          <GalleryEditor keys={gallery} onChange={setGallery} folder="editions" />
          <Note>
            ຮູບພວກນີ້ຂຶ້ນທ້າຍໜ້າປີ — ໃສ່ຫຼັງງານຈົບ · ຮູບຂອງໜ້າແຮກແຍກຕ່າງຫາກຢູ່ “ເນື້ອຫາເວັບສ່ວນກາງ”
          </Note>
        </CardBody>
      </Card>

      {save.error && <ErrorNote error={save.error} />}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກ'}
        </Button>
        {saved && !save.isPending && <span className="text-[13px] text-ok">ບັນທຶກແລ້ວ</span>}
      </div>
    </form>
  );
}
