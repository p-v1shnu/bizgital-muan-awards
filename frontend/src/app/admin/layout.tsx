'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { AuthProvider } from '@/lib/auth-context';

/**
 * Providers for the whole back office. They live here rather than at the root
 * so the public site (M3) stays server-rendered with no client runtime.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Admin data changes because someone on the team changed it, so a
            // window refocus is a good moment to re-read, but a 30s stale
            // window keeps tab-switching from refetching everything.
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
