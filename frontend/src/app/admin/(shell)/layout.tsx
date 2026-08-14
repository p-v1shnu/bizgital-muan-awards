'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingBlock } from '@/components/ui/feedback';
import { Sidebar } from '@/components/admin/sidebar';
import { useAuth } from '@/lib/auth-context';

/**
 * The signed-in shell. This gate is a convenience for the person using the
 * browser, not a security boundary — every admin endpoint is guarded
 * server-side, so a forced render here would still show nothing.
 */
export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/admin/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
