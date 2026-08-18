'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Input } from '@/components/ui/field';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { Pager } from '@/components/admin/pager';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { AuditEntry } from '@/types/api';
import { formatDateTime } from '@/lib/dates';

/**
 * Actions are dotted names like "edition.phase.changed". Rather than keep a
 * table of every one, the parts are translated and joined — a new action added
 * on the server still reads sensibly here.
 */
const WORDS: Record<string, string> = {
  admin: 'ຜູ້ໃຊ້',
  audit: 'ປະຫວັດ',
  category: 'ສາຂາ',
  creator: 'ຄຣີເອເຕີ',
  edition: 'ປີ',
  judge: 'ກຳມະການ',
  nomination: 'ນອມິນີ',
  site: 'ເນື້ອຫາເວັບ',
  sponsor: 'ສະປອນເຊີ',
  sponsorTier: 'ລະດັບສະປອນເຊີ',
  submission: 'ລາຍຊື່ທາງບ້ານ',
  user: 'ບັນຊີ',
  password: 'ລະຫັດຜ່ານ',
  phase: 'ສະຖານະ',
  submissions: 'ຟອມ',
  winner: 'ຜູ້ຊະນະ',
  created: 'ສ້າງ',
  updated: 'ແກ້ໄຂ',
  deleted: 'ລຶບ',
  removed: 'ເອົາອອກ',
  reordered: 'ຮຽງລຳດັບ',
  copied: 'ຄັດລອກ',
  changed: 'ປ່ຽນ',
  opened: 'ເປີດ',
  closed: 'ປິດ',
  added: 'ເພີ່ມ',
  assigned: 'ມອບໝາຍ',
  unassigned: 'ຍົກເລີກມອບໝາຍ',
  accepted: 'ຮັບ',
  rejected: 'ປະຕິເສດ',
  set: 'ຕິດ',
  cleared: 'ຍົກເລີກ',
  login: 'ເຂົ້າສູ່ລະບົບ',
  logout: 'ອອກຈາກລະບົບ',
  setup: 'ຕັ້ງຄ່າ',
  completed: 'ສຳເລັດ',
  assignment: 'ການມອບໝາຍ',
};

function describe(action: string) {
  return action
    .split('.')
    .map((part) => WORDS[part] ?? part)
    .join(' · ');
}

export default function AuditPage() {
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(term, 250);

  const { data, isLoading, error } = useApiPage<AuditEntry>(
    `/admin/audit?page=${page}&perPage=40${
      debounced.trim() ? `&action=${encodeURIComponent(debounced.trim())}` : ''
    }`,
  );

  return (
    <>
      <PageHeader crumbs={[{ label: 'ປະຫວັດການແກ້ໄຂ' }]} />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Card>
          <CardHeader
            title="ທຸກການປ່ຽນແປງ"
            aside={data?.meta ? `${data.meta.total} ລາຍການ` : undefined}
          />

          <div className="border-b border-rule p-3">
            <Input
              placeholder="ກັ່ນຕອງຕາມຊື່ action ເຊັ່ນ edition.phase…"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
            />
          </div>

          {isLoading ? (
            <LoadingBlock />
          ) : !data?.data.length ? (
            <EmptyState title="ບໍ່ມີລາຍການ" />
          ) : (
            <TableWrap className="py-3">
              <Table>
                <thead>
                  <Tr>
                    <Th className="w-48">ເມື່ອໃດ</Th>
                    <Th className="w-40">ໃຜ</Th>
                    <Th>ເຮັດຫຍັງ</Th>
                    <Th className="w-32">ກັບ</Th>
                  </Tr>
                </thead>
                <tbody>
                  {data.data.map((entry) => (
                    <Tr key={entry.id}>
                      <Td className="whitespace-nowrap text-ink-3">
                        {formatDateTime(entry.createdAt)}
                      </Td>
                      <Td className="text-ink">{entry.user?.name ?? '—'}</Td>
                      <Td>
                        <span className="text-ink">{describe(entry.action)}</span>
                        <code className="ml-2 text-[11px] text-ink-3">{entry.action}</code>
                      </Td>
                      <Td>
                        <Badge>{entry.targetType}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}

          {data?.meta && <Pager meta={data.meta} onChange={setPage} />}
        </Card>
      </PageBody>
    </>
  );
}
