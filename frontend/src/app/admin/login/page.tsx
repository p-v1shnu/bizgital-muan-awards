'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardBody, FoilRule } from '@/components/ui/card';
import { ErrorNote, LoadingBlock } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';

/**
 * Why the visitor is looking at this form when they did not ask to be.
 *
 * Changing a password ends every session for that account, this browser
 * included (`UsersService.changePassword`) — so the person who just changed
 * theirs is sent here, and without a word for it the back office looks like it
 * threw them out for no reason.
 */
const NOTICES: Record<string, string> = {
  'password-changed': 'ປ່ຽນລະຫັດຜ່ານແລ້ວ — ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່ດ້ວຍລະຫັດຜ່ານໃໝ່',
};

/**
 * Its own component behind its own Suspense boundary, because reading the query
 * string is what makes a render dynamic: called from the page body,
 * `useSearchParams` failed the build outright — "useSearchParams() should be
 * wrapped in a suspense boundary at page /admin/login". Kept down here, the
 * form above it is still prerendered and only this sentence waits.
 */
function SignedOutNotice() {
  const key = useSearchParams().get('notice');
  const notice = key ? NOTICES[key] : undefined;
  if (!notice) return null;

  return (
    <p
      role="status"
      className="mb-4 rounded-[var(--radius-sm)] border border-brand-edge bg-brand-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-brand-deep"
    >
      {notice}
    </p>
  );
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/admin');
  }, [loading, user, router]);

  // Before the first admin exists there is nothing to log in to, so send the
  // very first visitor to setup instead of a form they cannot pass.
  useEffect(() => {
    apiFetch<{ needsSetup: boolean }>('/auth/setup-state', { skipRefresh: true })
      .then((state) => {
        if (state.needsSetup) router.replace('/admin/setup');
      })
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      router.replace('/admin');
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <FoilRule className="mx-auto mb-5 w-16" />
          <h1 className="font-serif text-3xl text-ink">ມ່ວນອາວອດສ໌</h1>
          <p className="mt-1 text-[13px] text-ink-3">ເຂົ້າສູ່ລະບົບຫຼັງບ້ານ</p>
        </div>

        <Card>
          <CardBody>
            <Suspense fallback={null}>
              <SignedOutNotice />
            </Suspense>
            <form onSubmit={onSubmit} noValidate>
              <Field label="ອີເມວ">
                <Input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="ລະຫັດຜ່ານ">
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>

              {error != null && (
                <div className="mb-4">
                  <ErrorNote error={error} />
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={pending}>
                {pending ? 'ກຳລັງເຂົ້າ…' : 'ເຂົ້າສູ່ລະບົບ'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
