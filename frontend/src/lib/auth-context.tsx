'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, refreshAccessToken, setAccessToken } from './api/client';
import type { AuthenticatedUser } from '@/types/api';

interface AuthState {
  user: AuthenticatedUser | null;
  /** True until the first refresh attempt settles, so pages don't flash. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /**
   * `notice` names why, for the sign-in page to explain itself. Signing out by
   * hand needs no explanation; being sent back by a password change does.
   */
  logout: (notice?: LogoutNotice) => Promise<void>;
}

/** The one reason a sign-out happens to somebody rather than by them. */
export type LogoutNotice = 'password-changed';

const AuthContext = createContext<AuthState | null>(null);

interface Session {
  user: AuthenticatedUser;
  accessToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On a page load the access token is gone (it only ever lived in memory),
  // but the refresh cookie survives — so a reload silently signs back in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await refreshAccessToken();
        if (!token || cancelled) return;
        const me = await apiFetch<AuthenticatedUser>('/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<Session>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipRefresh: true,
    });
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const logout = useCallback(
    async (notice?: LogoutNotice) => {
      // Telling the server is best-effort, and the call failing is ordinary
      // rather than exceptional: the token may already be dead — expired, or
      // cancelled by a password change, which is what `notice` is for — and
      // then this answers 401 and the refresh behind it cannot help. Both
      // callers invoke this as `void logout()`, so a rejection here would go
      // nowhere except the console. What actually signs the person out is
      // below, and it cannot fail.
      try {
        await apiFetch<void>('/auth/logout', { method: 'POST' });
      } catch {
        // Nothing to do about it and nothing to tell them.
      } finally {
        setAccessToken(null);
        setUser(null);
        router.replace(notice ? `/admin/login?notice=${notice}` : '/admin/login');
      }
    },
    [router],
  );

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Convenience for hiding super-admin-only controls. */
export function useIsSuperAdmin() {
  return useAuth().user?.role === 'SUPER_ADMIN';
}
