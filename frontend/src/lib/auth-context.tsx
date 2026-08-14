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
  logout: () => Promise<void>;
}

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

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setUser(null);
      router.replace('/admin/login');
    }
  }, [router]);

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
