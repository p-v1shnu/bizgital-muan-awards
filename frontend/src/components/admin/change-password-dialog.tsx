'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorNote } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { useApiMutation } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth-context';

/**
 * Every role changes its own password here. It used to live on the users page
 * alone, which only super admins can open, so a regular admin had no way to.
 */
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [mismatch, setMismatch] = useState(false);
  const { logout } = useAuth();
  // The dialog is mounted from the sidebar and from the users page at once,
  // and a closed <dialog> still renders its form — a fixed id would let the
  // submit button of one reach the other's form.
  const formId = useId();

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
          <Button type="submit" form={formId} variant="primary" disabled={change.isPending}>
            {change.isPending ? 'ກຳລັງບັນທຶກ…' : 'ປ່ຽນລະຫັດຜ່ານ'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
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
                // A password change ends every session for this account, this
                // browser's included — deliberately, since a password is
                // usually changed because it may be in someone else's hands
                // (`UsersService.changePassword`). Nothing acted on that here,
                // so the back office sat there looking signed in while every
                // read and every save answered 401, until whoever it was
                // thought to reload the page. Going to the sign-in form with a
                // word about why is the whole of the fix.
                void logout('password-changed');
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
