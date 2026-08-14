'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardBody, FoilRule } from '@/components/ui/card';
import { ErrorNote, LoadingBlock, Note } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { apiFetch, setAccessToken } from '@/lib/api/client';
import type { AuthenticatedUser } from '@/types/api';

/** One-time creation of the first SUPER_ADMIN. The API refuses a second run. */
export default function SetupPage() {
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    apiFetch<{ needsSetup: boolean }>('/auth/setup-state', { skipRefresh: true })
      .then((state) => {
        setAvailable(state.needsSetup);
        if (!state.needsSetup) router.replace('/admin/login');
      })
      .catch(() => setAvailable(false));
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError(new Error('ລະຫັດຜ່ານສອງຊ່ອງບໍ່ຄືກັນ'));
      return;
    }
    setError(null);
    setPending(true);
    try {
      const session = await apiFetch<{ user: AuthenticatedUser; accessToken: string }>('/auth/setup', {
        method: 'POST',
        body: { name: form.name, email: form.email, password: form.password },
        skipRefresh: true,
      });
      setAccessToken(session.accessToken);
      // A full navigation, so AuthProvider re-reads the session it just gained.
      window.location.assign('/admin');
    } catch (caught) {
      setError(caught);
      setPending(false);
    }
  }

  if (available === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <FoilRule className="mx-auto mb-5 w-16" />
          <h1 className="font-serif text-3xl text-ink">ຕັ້ງຄ່າຄັ້ງທຳອິດ</h1>
          <p className="mt-1 text-[13px] text-ink-3">ສ້າງບັນຊີຜູ້ດູແລສູງສຸດ</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={onSubmit} noValidate>
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
                  autoComplete="username"
                  required
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </Field>
              <Field label="ລະຫັດຜ່ານ" help="ຢ່າງໜ້ອຍ 12 ຕົວອັກສອນ">
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
              </Field>
              <Field label="ຢືນຢັນລະຫັດຜ່ານ">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirm}
                  onChange={(event) => setForm({ ...form, confirm: event.target.value })}
                />
              </Field>

              {error != null && (
                <div className="mb-4">
                  <ErrorNote error={error} />
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={pending}>
                {pending ? 'ກຳລັງສ້າງ…' : 'ສ້າງບັນຊີ'}
              </Button>
            </form>

            <div className="mt-4">
              <Note>
                ຫຼັງສ້າງແລ້ວ ໃຫ້ຕັ້ງ <code className="text-ink-2">SETUP_ENABLED=false</code> ໃນ{' '}
                <code className="text-ink-2">.env</code> ເພື່ອປິດໜ້ານີ້ຖາວອນ
              </Note>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
