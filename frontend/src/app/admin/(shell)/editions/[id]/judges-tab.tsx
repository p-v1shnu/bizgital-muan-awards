'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Search, Trash2 } from 'lucide-react';

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
  const reorder = useApiMutation<{ items: { id: string; sortOrder: number }[] }>(
    `${path}/reorder`,
    'POST',
    invalidate,
  );

  /**
   * Swaps a row with its neighbour. The panel is listed chair first, so this
   * moves people within their role rather than across it.
   */
  function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    const next = [...data];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ items: next.map((row, position) => ({ id: row.id, sortOrder: position })) });
  }

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

        {(error != null || reorder.error != null) && (
          <div className="p-4">
            <ErrorNote error={error ?? reorder.error} />
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
          data.map((assignment, index) => (
            <div
              key={assignment.id}
              className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`ຍ້າຍ ${assignment.judge.nameLo} ຂຶ້ນ`}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                  className="text-ink-3 hover:text-ink disabled:opacity-25"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`ຍ້າຍ ${assignment.judge.nameLo} ລົງ`}
                  disabled={index === data.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                  className="text-ink-3 hover:text-ink disabled:opacity-25"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
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

  // The panel is usually settled in one sitting, and half the names will not
  // be in the library yet (PRD §6.2) — sending the team to another page to
  // type two fields and come back is how a list gets left half done.
  const [creating, setCreating] = useState({ nameLo: '', positionLo: '' });
  const create = useApiMutation<Record<string, unknown>, Judge>('/admin/judges', 'POST', [
    '/admin/judges',
  ]);

  function createAndAssign(role: JudgeRole) {
    create.mutate(
      { nameLo: creating.nameLo, positionLo: creating.positionLo },
      {
        onSuccess: (judge) => {
          assign.mutate(
            { judgeId: judge.id, role },
            { onSuccess: () => setCreating({ nameLo: '', positionLo: '' }) },
          );
        },
      },
    );
  }

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
          <li className="px-3 py-3 text-[12.5px] text-ink-3">ບໍ່ພົບໃນຄັງ — ສ້າງຄົນໃໝ່ຂ້າງລຸ່ມໄດ້ເລີຍ</li>
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

      <div className="mt-4 rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2 p-3">
        <p className="mb-2 text-[12px] font-semibold text-ink-2">ບໍ່ມີໃນຄັງ? ສ້າງໃໝ່ໄດ້ເລີຍ</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="ຊື່">
            <Input
              value={creating.nameLo}
              onChange={(event) => setCreating({ ...creating, nameLo: event.target.value })}
            />
          </Field>
          <Field label="ຕຳແໜ່ງ / ອົງກອນ">
            <Input
              value={creating.positionLo}
              onChange={(event) => setCreating({ ...creating, positionLo: event.target.value })}
            />
          </Field>
        </div>

        {create.error && <ErrorNote error={create.error} />}

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!creating.nameLo || !creating.positionLo || create.isPending}
            onClick={() => createAndAssign('MEMBER')}
          >
            ສ້າງ ແລະ ເປັນກຳມະການ
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!creating.nameLo || !creating.positionLo || create.isPending}
            onClick={() => createAndAssign('CHAIR')}
          >
            ສ້າງ ແລະ ເປັນປະທານ
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-ink-3">
          ຮູບ ແລະ ປະຫວັດຫຍໍ້ ເພີ່ມພາຍຫຼັງໄດ້ທີ່ໜ້າ “ຄັງກຳມະການ”
        </p>
      </div>
    </Dialog>
  );
}
