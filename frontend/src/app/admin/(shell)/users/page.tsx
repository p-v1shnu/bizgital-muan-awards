'use client';

import { useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { PageBody, PageHeader } from '@/components/admin/page-header';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { useApi, useApiMutation } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth-context';
import type { AdminRole, AdminUser } from '@/types/api';
import { formatDateTime } from '@/lib/dates';

const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: 'ຜູ້ດູແລສູງສຸດ',
  ADMIN: 'ທີມງານ',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, isLoading, error } = useApi<AdminUser[]>('/admin/users');

  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const remove = useApiMutation<{ id: string }>((body) => `/admin/users/${body.id}`, 'DELETE', [
    '/admin/users',
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'ຜູ້ໃຊ້ຫຼັງບ້ານ' }]}
        actions={
          <>
            <Button size="sm" onClick={() => setChangingPassword(true)}>
              <KeyRound className="size-3.5" /> ປ່ຽນລະຫັດຜ່ານຂອງຂ້ອຍ
            </Button>
            <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" /> ເພີ່ມຜູ້ໃຊ້
            </Button>
          </>
        }
      />

      <PageBody>
        {error != null && <ErrorNote error={error} />}

        <Card>
          <CardHeader title="ບັນຊີທີມງານ" aside={data ? `${data.length} ຄົນ` : undefined} />

          {isLoading ? (
            <LoadingBlock />
          ) : !data?.length ? (
            <EmptyState title="ຍັງບໍ່ມີບັນຊີອື່ນ" />
          ) : (
            <TableWrap className="py-3">
              <Table>
                <thead>
                  <Tr>
                    <Th>ຊື່</Th>
                    <Th>ອີເມວ</Th>
                    <Th className="w-40">ສິດ</Th>
                    <Th className="w-44">ເຂົ້າລ່າສຸດ</Th>
                    <Th />
                  </Tr>
                </thead>
                <tbody>
                  {data.map((account) => (
                    <Tr key={account.id}>
                      <Td className="font-medium text-ink">
                        {account.name}
                        {account.id === me?.id && (
                          <span className="ml-2 text-[11px] text-ink-3">(ຂ້ອຍ)</span>
                        )}
                      </Td>
                      <Td>{account.email}</Td>
                      <Td>
                        <Badge tone={account.role === 'SUPER_ADMIN' ? 'brand' : 'neutral'}>
                          {ROLE_LABEL[account.role]}
                        </Badge>
                      </Td>
                      <Td>
                        {account.lastLoginAt ? (
                          formatDateTime(account.lastLoginAt)
                        ) : (
                          <span className="text-ink-3">ຍັງບໍ່ເຄີຍເຂົ້າ</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={account.id === me?.id}
                          aria-label={`ລຶບ ${account.name}`}
                          onClick={() => setDeleting(account)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </PageBody>

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />
      <ChangePasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
        }
        pending={remove.isPending}
        danger
        title={`ລຶບບັນຊີ “${deleting?.name}”?`}
        description="ບັນຊີຈະເຂົ້າລະບົບບໍ່ໄດ້ອີກ ແຕ່ປະຫວັດການແກ້ໄຂຍັງຢູ່"
        confirmLabel="ລຶບ"
      />
    </>
  );
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN' as AdminRole,
  });

  const create = useApiMutation<Record<string, unknown>>('/admin/users', 'POST', ['/admin/users']);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ເພີ່ມຜູ້ໃຊ້ຫຼັງບ້ານ"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={create.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="user-form" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'ກຳລັງສ້າງ…' : 'ສ້າງ'}
          </Button>
        </>
      }
    >
      <form
        id="user-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(form, {
            onSuccess: () => {
              setForm({ name: '', email: '', password: '', role: 'ADMIN' });
              onClose();
            },
          });
        }}
      >
        <Field label="ຊື່">
          <Input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="ອີເມວ">
          <Input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>
        <Field label="ລະຫັດຜ່ານ" help="ຢ່າງໜ້ອຍ 12 ຕົວອັກສອນ — ບອກເຈົ້າຂອງບັນຊີໃຫ້ປ່ຽນເອງພາຍຫຼັງ">
          <Input
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </Field>
        <Field label="ສິດ">
          <Select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })}
          >
            <option value="ADMIN">{ROLE_LABEL.ADMIN} — ຈັດການເນື້ອຫາໄດ້ທັງໝົດ</option>
            <option value="SUPER_ADMIN">{ROLE_LABEL.SUPER_ADMIN} — ຈັດການຜູ້ໃຊ້ ແລະ ເບິ່ງປະຫວັດໄດ້</option>
          </Select>
        </Field>

        {create.error && <ErrorNote error={create.error} />}
      </form>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [mismatch, setMismatch] = useState(false);

  const change = useApiMutation<Record<string, unknown>>('/admin/users/me/password', 'POST', []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ປ່ຽນລະຫັດຜ່ານຂອງຂ້ອຍ"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={change.isPending}>
            ຍົກເລີກ
          </Button>
          <Button type="submit" form="password-form" variant="primary" disabled={change.isPending}>
            {change.isPending ? 'ກຳລັງບັນທຶກ…' : 'ປ່ຽນລະຫັດຜ່ານ'}
          </Button>
        </>
      }
    >
      <form
        id="password-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (form.newPassword !== form.confirm) {
            setMismatch(true);
            return;
          }
          setMismatch(false);
          change.mutate(
            { currentPassword: form.currentPassword, newPassword: form.newPassword },
            {
              onSuccess: () => {
                setForm({ currentPassword: '', newPassword: '', confirm: '' });
                onClose();
              },
            },
          );
        }}
      >
        <Field label="ລະຫັດຜ່ານປັດຈຸບັນ">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
          />
        </Field>
        <Field label="ລະຫັດຜ່ານໃໝ່" help="ຢ່າງໜ້ອຍ 12 ຕົວອັກສອນ">
          <Input
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          />
        </Field>
        <Field label="ຢືນຢັນລະຫັດຜ່ານໃໝ່" error={mismatch ? 'ລະຫັດຜ່ານສອງຊ່ອງບໍ່ຄືກັນ' : undefined}>
          <Input
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          />
        </Field>

        {change.error && <ErrorNote error={change.error} />}
      </form>
    </Dialog>
  );
}
