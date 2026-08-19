'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, Eye, Image as ImageIcon, ListChecks, Star } from 'lucide-react';

import { Badge, PHASE_LABEL, PhaseBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { PhaseSteps } from '@/components/admin/phase-steps';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/api/hooks';
import type { DashboardOverview, DashboardTask } from '@/types/api';

/** Every task the API can raise, in the words the team uses. */
const TASK_TEXT: Record<string, { title: (count: number) => string; detail: string; icon: typeof AlertCircle }> = {
  'no-categories': {
    title: () => 'ປີນີ້ຍັງບໍ່ມີສາຂາເລີຍ',
    detail: 'ຕ້ອງມີຢ່າງໜ້ອຍ 1 ສາຂາຈຶ່ງເຜີຍແຜ່ໄດ້',
    icon: ListChecks,
  },
  'categories-without-nominees': {
    title: (count) => `${count} ສາຂາຍັງບໍ່ມີຜູ້ເຂົ້າຊີງ`,
    detail: 'ໃສ່ຜູ້ເຂົ້າຊີງໃຫ້ຄົບກ່ອນປະກາດ',
    icon: AlertCircle,
  },
  'categories-without-winner': {
    title: (count) => `${count} ສາຂາຍັງບໍ່ໄດ້ຕິດຜູ້ຊະນະ`,
    detail: 'ຕິດຜູ້ຊະນະໃຫ້ຄົບກ່ອນປະກາດຜົນ',
    icon: Star,
  },
  'submissions-pending': {
    title: (count) => `ມີ ${count} ລາຍຊື່ຈາກທາງບ້ານລໍຖ້າ`,
    detail: 'ຈັດກຸ່ມຕາມຊື່ໃຫ້ແລ້ວໃນຄິວ',
    icon: ListChecks,
  },
  'no-judges': {
    title: () => 'ຍັງບໍ່ໄດ້ເລືອກກຳມະການ',
    detail: 'ບໍ່ບລັອກການເຜີຍແຜ່ ແຕ່ໜ້າປີຈະບໍ່ມີພາກກຳມະການ',
    icon: Star,
  },
  'no-hero-image': {
    title: () => 'ຍັງບໍ່ໄດ້ໃສ່ຮູບ hero ຂອງປີ',
    detail: 'ໜ້າປີຈະໃຊ້ຮູບສຳຮອງໄປກ່ອນ',
    icon: ImageIcon,
  },
};

export default function DashboardPage() {
  const { data, isLoading, error } = useApi<DashboardOverview>('/admin/dashboard');

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ພາບລວມ' }]}
        actions={
          <ButtonLink href="/" size="sm" target="_blank">
            ເບິ່ງເວັບໄຊ <ArrowRight className="size-3.5" />
          </ButtonLink>
        }
      />

      <PageBody>
        {error != null && <ErrorNote error={error} />}
        {isLoading && <LoadingBlock />}

        {data && !data.edition && (
          <Card>
            <EmptyState
              title="ຍັງບໍ່ມີປີທີ່ຈັດງານ"
              description="ສ້າງປີທຳອິດເພື່ອເລີ່ມໃສ່ສາຂາ ຜູ້ເຂົ້າຊີງ ແລະ ກຳມະການ"
              action={
                <ButtonLink href="/admin/editions" variant="primary">
                  ໄປໜ້າປີທີ່ຈັດງານ
                </ButtonLink>
              }
            />
          </Card>
        )}

        {data?.edition && data.stats && (
          <>
            <Card className="grid items-start gap-4 p-5 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">
                  ປີທີ່ກຳລັງເຮັດວຽກຢູ່
                </p>
                <p className="font-serif text-4xl leading-none text-ink">{data.edition.year}</p>
                <p className="mt-1 font-serif text-[17px] text-ink-2">{data.edition.titleLo}</p>
                <div className="mt-4">
                  <PhaseSteps current={data.edition.phase} />
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <PhaseBadge phase={data.edition.phase} />
                <Badge tone={data.edition.acceptingSubmissions ? 'ok' : 'neutral'} dot>
                  {data.edition.acceptingSubmissions ? 'ຟອມເປີດຢູ່' : 'ຟອມປິດຢູ່'}
                </Badge>
                <ButtonLink href={`/admin/editions/${data.edition.id}`} variant="primary" className="mt-1">
                  ໄປໜ້າຈັດການປີ <ArrowRight className="size-3.5" />
                </ButtonLink>
                {data.edition.phase !== 'DRAFT' && (
                  <ButtonLink href={`/awards/${data.edition.slug}`} size="sm" target="_blank">
                    <Eye className="size-3.5" /> ເບິ່ງໜ້າຈິງ
                  </ButtonLink>
                )}
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                value={data.stats.pendingSubmissions}
                label="ລາຍຊື່ລໍຖ້າຄັດກອງ"
                meta={data.stats.pendingSubmissions > 0 ? 'ຕ້ອງເຮັດ' : 'ບໍ່ມີຄ້າງ'}
                flag={data.stats.pendingSubmissions > 0}
                href="/admin/submissions"
              />
              <Stat
                value={data.stats.categories}
                label="ສາຂາໃນປີນີ້"
                meta={`ເດັ່ນ ${data.stats.featuredCategories} ສາຂາ`}
              />
              <Stat value={data.stats.nominations} label="ຜູ້ເຂົ້າຊີງທັງໝົດ" />
              <Stat value={data.stats.judges} label="ກຳມະການ" href="/admin/judges" />
            </div>

            {data.tasks.length > 0 && (
              <Card>
                <CardHeader title="ວຽກທີ່ຄ້າງ" aside="ຮຽງຕາມສິ່ງທີ່ບລັອກການເຜີຍແຜ່ກ່ອນ" />
                {data.tasks.map((task) => (
                  <TaskRow key={task.key} task={task} editionId={data.edition!.id} />
                ))}
              </Card>
            )}

            <Card>
              <CardHeader title="ຄວາມຄືບໜ້າແຕ່ລະສາຂາ" aside={String(data.edition.year)} />
              {data.categories.length === 0 ? (
                <EmptyState title="ຍັງບໍ່ມີສາຂາ" />
              ) : (
                <TableWrap className="py-3">
                  <Table>
                    <thead>
                      <Tr>
                        <Th>ສາຂາ</Th>
                        <Th className="w-24">ຜູ້ເຂົ້າຊີງ</Th>
                        <Th className="w-44">ຜູ້ຊະນະ</Th>
                        <Th className="w-24">ເດັ່ນ</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {data.categories.map((category) => (
                        <Tr key={category.id}>
                          <Td className="font-medium text-ink">{category.nameLo}</Td>
                          <Td
                            className={cn(
                              'font-serif text-base',
                              category.nominationCount === 0 ? 'text-ink-3' : 'text-ink',
                            )}
                          >
                            {category.nominationCount}
                          </Td>
                          <Td>
                            {category.winner ? (
                              <span className="font-serif text-[15px] text-ink">
                                {category.winner.nameLo}
                              </span>
                            ) : (
                              <Badge>ຍັງ</Badge>
                            )}
                          </Td>
                          <Td>{category.isFeatured && <Badge tone="brand">ເດັ່ນ</Badge>}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}

function Stat({
  value,
  label,
  meta,
  flag,
  href,
}: {
  value: number;
  label: string;
  meta?: string;
  flag?: boolean;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        'h-full p-4',
        flag && 'border-brand-edge bg-brand-soft',
        href && 'transition-colors hover:border-ink-3',
      )}
    >
      <p className={cn('font-serif text-3xl leading-none', value === 0 ? 'text-ink-3' : 'text-ink')}>
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-2">{label}</p>
      {meta && <p className="mt-1.5 text-[11px] text-ink-3">{meta}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const TASK_LINK: Record<string, (editionId: string) => { href: string; label: string }> = {
  'no-categories': (id) => ({ href: `/admin/editions/${id}?tab=categories`, label: 'ໃສ່ສາຂາ' }),
  'categories-without-nominees': (id) => ({
    href: `/admin/editions/${id}?tab=nominees`,
    label: 'ໃສ່ຜູ້ເຂົ້າຊີງ',
  }),
  'categories-without-winner': (id) => ({
    href: `/admin/editions/${id}?tab=nominees`,
    label: 'ຕິດຜູ້ຊະນະ',
  }),
  'submissions-pending': () => ({ href: '/admin/submissions', label: 'ເປີດຄິວ' }),
  'no-judges': (id) => ({ href: `/admin/editions/${id}?tab=judges`, label: 'ເລືອກ' }),
  'no-hero-image': (id) => ({ href: `/admin/editions/${id}`, label: 'ອັບໂຫລດ' }),
};

function TaskRow({ task, editionId }: { task: DashboardTask; editionId: string }) {
  const text = TASK_TEXT[task.key];
  const link = TASK_LINK[task.key]?.(editionId);
  if (!text) return null;
  const Icon = text.icon;

  return (
    <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-[7px]',
          task.severity === 'blocking' && 'bg-stop-soft text-stop',
          task.severity === 'attention' && 'bg-warn-soft text-warn',
          task.severity === 'info' && 'bg-brand-soft text-brand-deep',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{text.title(task.count)}</span>
        <span className="block text-[11.5px] text-ink-3">
          {text.detail}
          {task.blocks && ` · ບລັອກຂັ້ນ “${PHASE_LABEL[task.blocks]}”`}
        </span>
      </span>
      {link && (
        <ButtonLink href={link.href} size="sm" className="ml-auto">
          {link.label}
        </ButtonLink>
      )}
    </div>
  );
}
