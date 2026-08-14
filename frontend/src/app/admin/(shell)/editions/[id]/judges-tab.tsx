'use client';

import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

import { Avatar } from './nominees-tab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { useApi, useApiMutation, useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { Edition, EditionJudge, Judge, JudgeRole } from '@/types/api';

export function JudgesTab({ edition }: { edition: Edition }) {
  const path = `/admin/editions/${edition.id}/judges`;
  const { data, isLoading, error } = useApi<EditionJudge[]>(path);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<EditionJudge | null>(null);

  const invalidate = [path, '/admin/dashboard'];
  const updateRole = useApiMutation<{ id: string; role: JudgeRole }>(
    (vars) => `${path}/${vars.id}`,
    'PATCH',
    invalidate,
    // The id addresses the assignment; only role belongs in the body.
    (vars) => ({ role: vars.role }),
  );
  const unassign = useApiMutation<{ id: string }>((vars) => `${path}/${vars.id}`, 'DELETE', invalidate);

  return (
    <>
      <Card>
        <CardHeader
          title="ຄະນະກຳມະການປີນີ້"
          aside={
            <>
              <span>{data?.length ?? 0} ຄົນ</span>
              <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                <Plus className="size-3.5" /> ເລືອກຈາກຄັງ
              </Button>
            </>
          }
        />

        {error != null && (
          <div className="p-4">
            <ErrorNote error={error} />
          </div>
        )}

        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState
            title="ຍັງບໍ່ໄດ້ເລືອກກຳມະການ"
            description="ບໍ່ບລັອກການເຜີຍແຜ່ ແຕ່ໜ້າປີຈະບໍ່ມີພາກກຳມະການ"
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                ເລືອກຈາກຄັງ
              </Button>
            }
          />
        ) : (
          data.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
            >
              <Avatar name={assignment.judge.nameLo} avatarKey={assignment.judge.avatarKey} />
              <div className="min-w-0">
                <p className="truncate font-serif text-[15.5px] leading-tight text-ink">
                  {assignment.judge.nameLo}
                </p>
                <p className="truncate text-[11.5px] text-ink-3">{assignment.judge.positionLo}</p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {assignment.role === 'CHAIR' && <Badge tone="brand">ປະທານ</Badge>}
                <Select
                  className="w-32"
                  value={assignment.role}
                  disabled={updateRole.isPending}
                  onChange={(event) =>
                    updateRole.mutate({ id: assignment.id, role: event.target.value as JudgeRole })
                  }
                >
                  <option value="CHAIR">ປະທານ</option>
                  <option value="MEMBER">ກຳມະການ</option>
                </Select>
                <Button
                  size="sm"
                  variant="danger"
                  aria-label={`ເອົາ ${assignment.judge.nameLo} ອອກ`}
                  onClick={() => setRemoving(assignment)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <PickJudgeDialog
        open={adding}
        editionId={edition.id}
        assigned={new Set((data ?? []).map((assignment) => assignment.judgeId))}
        onClose={() => setAdding(false)}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing && unassign.mutate({ id: removing.id }, { onSuccess: () => setRemoving(null) })
        }
        pending={unassign.isPending}
        danger
        title={`ເອົາ “${removing?.judge.nameLo}” ອອກຈາກປີນີ້?`}
        description="ຂໍ້ມູນໃນຄັງກຳມະການຍັງຢູ່ຄືເກົ່າ"
        confirmLabel="ເອົາອອກ"
      />
    </>
  );
}

function PickJudgeDialog({
  open,
  editionId,
  assigned,
  onClose,
}: {
  open: boolean;
  editionId: string;
  assigned: Set<string>;
  onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term, 250);
  const { data } = useApiPage<Judge>(
    `/admin/judges?perPage=20${debounced.trim() ? `&q=${encodeURIComponent(debounced.trim())}` : ''}`,
  );

  const assign = useApiMutation<{ judgeId: string; role: JudgeRole }>(
    `/admin/editions/${editionId}/judges`,
    'POST',
    [`/admin/editions/${editionId}/judges`, '/admin/dashboard'],
  );

  return (
    <Dialog open={open} onClose={onClose} title="ເລືອກກຳມະການຈາກຄັງ" width="lg">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          className="pl-9"
          placeholder="ຄົ້ນຫາຊື່…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {assign.error && (
        <div className="mb-3">
          <ErrorNote error={assign.error} />
        </div>
      )}

      <ul className="max-h-80 overflow-y-auto rounded-[var(--radius-ui-sm)] border border-rule bg-white">
        {!data?.data.length ? (
          <li className="px-3 py-3 text-[12.5px] text-ink-3">
            ບໍ່ພົບໃນຄັງ — ໄປໜ້າ “ຄັງກຳມະການ” ເພື່ອເພີ່ມຄົນໃໝ່
          </li>
        ) : (
          data.data.map((judge) => {
            const already = assigned.has(judge.id);
            return (
              <li key={judge.id} className="border-b border-hairline last:border-b-0">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={judge.nameLo} avatarKey={judge.avatarKey} />
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[15px] text-ink">{judge.nameLo}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{judge.positionLo}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {already ? (
                      <span className="text-[11px] text-ink-3">ຢູ່ໃນປີນີ້ແລ້ວ</span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          disabled={assign.isPending}
                          onClick={() => assign.mutate({ judgeId: judge.id, role: 'MEMBER' })}
                        >
                          ເປັນກຳມະການ
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={assign.isPending}
                          onClick={() => assign.mutate({ judgeId: judge.id, role: 'CHAIR' })}
                        >
                          ເປັນປະທານ
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Dialog>
  );
}
