'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Badge, PHASE_LABEL, PhaseBadge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { PHASE_ORDER } from '@/components/admin/phase-steps';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import type { Edition, EditionPhase } from '@/types/api';

export default function EditionsPage() {
  const { data, isLoading, error } = useApi<Edition[]>('/admin/editions');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ປີການປະກວດ' }]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> ສ້າງປີໃໝ່
          </Button>
        }
      />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Card>
          <CardHeader title="ທຸກປີ" aside={data ? `${data.length} ປີ` : undefined} />
          {isLoading ? (
            <LoadingBlock />
          ) : !data?.length ? (
            <EmptyState
              title="ຍັງບໍ່ມີປີການປະກວດ"
              description="ສ້າງປີປັດຈຸບັນກ່ອນ ແລ້ວຄ່ອຍຍ້ອນໃສ່ປີເກົ່າພາຍຫຼັງ"
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  ສ້າງປີໃໝ່
                </Button>
              }
            />
          ) : (
            <TableWrap className="py-3">
              <Table>
                <thead>
                  <Tr>
                    <Th className="w-24">ປີ</Th>
                    <Th>ຊື່ງານ</Th>
                    <Th className="w-52">ສະຖານະ</Th>
                    <Th className="w-32">ຟອມ</Th>
                    <Th />
                  </Tr>
                </thead>
                <tbody>
                  {data.map((edition) => (
                    <Tr key={edition.id}>
                      <Td className="font-serif text-xl text-ink">{edition.year}</Td>
                      <Td className="font-serif text-[15px] text-ink">{edition.titleLo}</Td>
                      <Td>
                        <PhaseBadge phase={edition.phase} />
                      </Td>
                      <Td>
                        <Badge tone={edition.submissionsOpen ? 'ok' : 'neutral'} dot>
                          {edition.submissionsOpen ? 'ເປີດ' : 'ປິດ'}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <ButtonLink href={`/admin/editions/${edition.id}`} size="sm">
                          ຈັດການ
                        </ButtonLink>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </PageBody>

      <CreateEditionDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateEditionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState({
    year: String(thisYear),
    titleLo: '',
    phase: 'DRAFT' as EditionPhase,
  });

  const create = useApiMutation<Record<string, unknown>, Edition>('/admin/editions', 'POST', [
    '/admin/editions',
    '/admin/dashboard',
  ]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    create.mutate(
      {
        year: Number(form.year),
        // The slug is the year: /awards/2026 is what gets shared and printed.
        slug: form.year,
        titleLo: form.titleLo || `ມ່ວນ ອະວອດ ${form.year}`,
        phase: form.phase,
      },
      {
        onSuccess: (edition) => {
          onClose();
          router.push(`/admin/editions/${edition.id}`);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ສ້າງປີການປະກວດ"
      description="ປີໃໝ່ເລີ່ມທີ່ “ຮ່າງ” · ປີເກົ່າທີ່ຍ້ອນໃສ່ ເລືອກສະຖານະສຸດທ້າຍໄດ້ເລີຍ"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={create.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="create-edition" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'ກຳລັງສ້າງ…' : 'ສ້າງ'}
          </Button>
        </>
      }
    >
      <form id="create-edition" onSubmit={submit} noValidate>
        <Field label="ປີ" help="ໃຊ້ເປັນ URL ຂອງໜ້ານຳ — /awards/2026">
          <Input
            type="number"
            required
            min={2000}
            max={2100}
            value={form.year}
            onChange={(event) => setForm({ ...form, year: event.target.value })}
          />
        </Field>
        <Field label="ຊື່ງານ" hint="— ວ່າງໄວ້ກໍໄດ້">
          <Input
            placeholder={`ມ່ວນ ອະວອດ ${form.year}`}
            value={form.titleLo}
            onChange={(event) => setForm({ ...form, titleLo: event.target.value })}
          />
        </Field>
        <Field label="ສະຖານະເລີ່ມຕົ້ນ">
          <Select
            value={form.phase}
            onChange={(event) => setForm({ ...form, phase: event.target.value as EditionPhase })}
          >
            {PHASE_ORDER.map((phase) => (
              <option key={phase} value={phase}>
                {PHASE_LABEL[phase]}
              </option>
            ))}
          </Select>
        </Field>

        {create.error && <ErrorNote error={create.error} />}

        {form.phase !== 'DRAFT' && (
          <div className="mt-3">
            <Note tone="brand">
              ເລືອກສະຖານະທີ່ບໍ່ແມ່ນ “ຮ່າງ” ແມ່ນສຳລັບປີເກົ່າທີ່ຈົບໄປແລ້ວ —
              ພໍສ້າງແລ້ວຈະ<b>ຖອຍກັບບໍ່ໄດ້</b>
            </Note>
          </div>
        )}
      </form>
    </Dialog>
  );
}
