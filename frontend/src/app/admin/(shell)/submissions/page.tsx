'use client';

import { useState } from 'react';
import { Check, ChevronDown, ExternalLink, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { Pager } from '@/components/admin/pager';
import { useApi, useApiMutation, useApiPage } from '@/lib/api/hooks';
import { safeHttpUrl } from '@/lib/utils';
import { useDebounced } from '@/lib/use-debounced';
import type { SubmissionGroup, SubmissionStatus } from '@/types/api';
import { formatDateTime } from '@/lib/dates';

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  PENDING: 'ລໍຖ້າຄັດກອງ',
  ACCEPTED: 'ຮັບແລ້ວ',
  REJECTED: 'ປະຕິເສດ',
  MERGED: 'ລວມກັບລາຍການອື່ນ',
};

export default function SubmissionsPage() {
  const [status, setStatus] = useState<SubmissionStatus>('PENDING');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(term, 250);

  const query = `/admin/submissions?status=${status}&page=${page}&perPage=25${
    debounced.trim() ? `&q=${encodeURIComponent(debounced.trim())}` : ''
  }`;
  const { data, isLoading, error } = useApiPage<SubmissionGroup>(query);
  const { data: counts } = useApi<Record<string, number>>('/admin/submissions/counts');

  return (
    <>
      <PageHeader crumbs={[{ label: 'ຄິວລາຍຊື່ຈາກທາງບ້ານ' }]} />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Note>
          ລາຍຊື່ຖືກ<b className="text-ink-2">ຈັດກຸ່ມຕາມຊື່ + ສາຂາ</b> — ຄົນດຽວທີ່ຖືກສົ່ງເຂົ້າມາ 20
          ເທື່ອຈະຂຶ້ນເປັນແຖວດຽວພ້ອມຕົວເລກ 20 · ຮັບ ຫຼື ປະຕິເສດເທື່ອດຽວ ມີຜົນທັງກຸ່ມ
        </Note>

        <Card>
          <CardHeader
            title="ຄິວ"
            aside={
              <>
                {(Object.keys(STATUS_LABEL) as SubmissionStatus[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setStatus(key);
                      setPage(1);
                    }}
                    className={
                      key === status
                        ? 'rounded-full border border-brand-edge bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-deep'
                        : 'rounded-full border border-transparent px-2.5 py-0.5 text-[11px] text-ink-3 hover:text-ink'
                    }
                  >
                    {STATUS_LABEL[key]}
                    {counts?.[key] ? ` ${counts[key]}` : ''}
                  </button>
                ))}
              </>
            }
          />

          <div className="border-b border-rule p-3">
            <Input
              placeholder="ຄົ້ນຫາຕາມຊື່ທີ່ຖືກສົ່ງເຂົ້າມາ…"
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
            <EmptyState
              title={status === 'PENDING' ? 'ບໍ່ມີລາຍຊື່ຄ້າງ' : `ບໍ່ມີລາຍການ “${STATUS_LABEL[status]}”`}
              description={status === 'PENDING' ? 'ຄັດກອງໝົດແລ້ວ' : undefined}
            />
          ) : (
            data.data.map((group) => <GroupRow key={group.key} group={group} query={query} />)
          )}

          {data?.meta && <Pager meta={data.meta} onChange={setPage} />}
        </Card>
      </PageBody>
    </>
  );
}

function GroupRow({ group, query }: { group: SubmissionGroup; query: string }) {
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const leadEntry = group.entries[0];
  const pending = leadEntry?.status === 'PENDING';

  const reject = useApiMutation<Record<string, never>>(
    `/admin/submissions/${leadEntry?.id}/reject`,
    'POST',
    ['/admin/submissions', '/admin/dashboard'],
  );

  return (
    <div className="border-b border-hairline last:border-b-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`size-4 shrink-0 text-ink-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          <span className="min-w-0">
            <span className="block truncate font-serif text-[16px] leading-tight text-ink">
              {group.creatorNameRaw}
            </span>
            <span className="block truncate text-[11.5px] text-ink-3">
              {group.category.nameLo} · {group.category.edition.year}
            </span>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Badge tone={group.count > 1 ? 'brand' : 'neutral'}>ສົ່ງເຂົ້າມາ {group.count} ເທື່ອ</Badge>
          {pending && (
            <>
              <Button size="sm" variant="danger" onClick={() => setRejecting(true)}>
                <X className="size-3.5" /> ປະຕິເສດ
              </Button>
              <Button size="sm" variant="primary" onClick={() => setAccepting(true)}>
                <Check className="size-3.5" /> ຮັບເປັນນອມິນີ
              </Button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <ul className="border-t border-hairline bg-panel-2/60 px-4 py-2">
          {group.entries.map((entry) => (
            <li key={entry.id} className="border-b border-hairline py-2 last:border-b-0">
              <p className="text-[12.5px] text-ink-2">
                {entry.reason || <span className="text-ink-3">ບໍ່ໄດ້ຂຽນເຫດຜົນ</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-3">
                <span>{formatDateTime(entry.createdAt)}</span>
                {entry.submitterName && <span>ໂດຍ {entry.submitterName}</span>}
                {safeHttpUrl(entry.creatorLink) && (
                  <a
                    href={safeHttpUrl(entry.creatorLink) as string}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-brand-deep hover:underline"
                  >
                    ລິງກ໌ <ExternalLink className="size-3" />
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      {reject.error && (
        <div className="px-4 pb-3">
          <ErrorNote error={reject.error} />
        </div>
      )}

      {leadEntry && (
        <>
          <AcceptDialog
            open={accepting}
            group={group}
            entryId={leadEntry.id}
            query={query}
            onClose={() => setAccepting(false)}
          />
          <ConfirmDialog
            open={rejecting}
            onClose={() => setRejecting(false)}
            onConfirm={() => reject.mutate({}, { onSuccess: () => setRejecting(false) })}
            pending={reject.isPending}
            danger
            title={`ປະຕິເສດ “${group.creatorNameRaw}”?`}
            description={`ທັງ ${group.count} ລາຍການທີ່ສົ່ງຊື່ນີ້ເຂົ້າມາຈະຖືກປະຕິເສດພ້ອມກັນ`}
            confirmLabel="ປະຕິເສດ"
          />
        </>
      )}
    </div>
  );
}

/**
 * Accepting has to answer one question: which creator is this? Either an
 * existing one from the library, or a new entry made from the raw name.
 */
function AcceptDialog({
  open,
  group,
  entryId,
  query,
  onClose,
}: {
  open: boolean;
  group: SubmissionGroup;
  entryId: string;
  query: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [creatorId, setCreatorId] = useState('');
  const [newCreatorSlug, setNewCreatorSlug] = useState('');

  const suggestions = useApiPage<{ id: string; nameLo: string; slug: string }>(
    `/admin/creators?perPage=10&q=${encodeURIComponent(group.creatorNameRaw)}`,
  );

  const accept = useApiMutation<Record<string, unknown>, { merged: number }>(
    `/admin/submissions/${entryId}/accept`,
    'POST',
    ['/admin/submissions', '/admin/dashboard', '/admin/creators', '/admin/categories'],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`ຮັບ “${group.creatorNameRaw}” ເປັນນອມິນີ`}
      description={`ສາຂາ ${group.category.nameLo} · ປີ ${group.category.edition.year}`}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={accept.isPending}>
            ຍົກເລີກ
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={accept.isPending || (mode === 'existing' ? !creatorId : !newCreatorSlug)}
            onClick={() =>
              accept.mutate(
                mode === 'existing' ? { creatorId } : { newCreatorSlug },
                { onSuccess: onClose },
              )
            }
          >
            {accept.isPending ? 'ກຳລັງດຳເນີນການ…' : 'ຮັບເປັນນອມິນີ'}
          </Button>
        </>
      }
    >
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'new' ? 'primary' : 'quiet'}
          onClick={() => setMode('new')}
        >
          ສ້າງຄຣີເອເຕີໃໝ່
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'existing' ? 'primary' : 'quiet'}
          onClick={() => setMode('existing')}
        >
          ຜູກກັບຄົນທີ່ມີຢູ່
        </Button>
      </div>

      {mode === 'new' ? (
        <Field label="slug ຂອງຄຣີເອເຕີໃໝ່" help={`ຊື່ຈະໃຊ້ຕາມທີ່ຜູ້ສົ່ງພິມມາ: “${group.creatorNameRaw}”`}>
          <Input
            pattern="[a-z0-9\-]+"
            placeholder="bounmy-chanthavong"
            value={newCreatorSlug}
            onChange={(event) => setNewCreatorSlug(event.target.value)}
          />
        </Field>
      ) : (
        <Field
          label="ເລືອກຄຣີເອເຕີຈາກຄັງ"
          help={suggestions.data?.data.length ? 'ຄົ້ນຫາຈາກຊື່ທີ່ຖືກສົ່ງເຂົ້າມາ' : 'ບໍ່ພົບຊື່ຄ້າຍກັນໃນຄັງ'}
        >
          <Select value={creatorId} onChange={(event) => setCreatorId(event.target.value)}>
            <option value="">— ເລືອກ —</option>
            {suggestions.data?.data.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.nameLo} (@{creator.slug})
              </option>
            ))}
          </Select>
        </Field>
      )}

      {group.count > 1 && (
        <Note tone="brand">
          ອີກ {group.count - 1} ລາຍການທີ່ສົ່ງຊື່ນີ້ເຂົ້າມາຈະຖືກ<b>ລວມເຂົ້າກັນ</b>ອັດຕະໂນມັດ
        </Note>
      )}

      {accept.error && (
        <div className="mt-3">
          <ErrorNote error={accept.error} />
        </div>
      )}
    </Dialog>
  );
}
