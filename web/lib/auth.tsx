'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokens, post } from './api';

export type Me = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  permissions: string[];
};

type LoginResult =
  | { ok: true }
  | { ok: false; message: string; lockedFor?: number; attempts?: number; maxAttempts?: number };

type AuthValue = {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  login: async () => ({ ok: false, message: 'not ready' }),
  logout: async () => {},
  can: () => false,
  refresh: async () => {},
});

function grantMatches(grant: string, needed: string) {
  if (grant === '*' || grant === needed) return true;
  const [gr, ga] = grant.split(':');
  const [nr, na] = needed.split(':');
  return gr === nr && (ga === '*' || ga === na);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api<Me>('/auth/me'));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback<AuthValue['login']>(async (email, password) => {
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: Me }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      tokens.set(res.accessToken, res.refreshToken);
      setUser(res.user);
      return { ok: true };
    } catch (e) {
      const err = e as { message: string; payload?: { lockedFor?: number; attempts?: number; maxAttempts?: number; retryAfter?: number } };
      return {
        ok: false,
        message: err.message ?? 'Login failed',
        lockedFor: err.payload?.lockedFor || err.payload?.retryAfter,
        attempts: err.payload?.attempts,
        maxAttempts: err.payload?.maxAttempts,
      };
    }
  }, []);

  const logout = useCallback(async () => {
    await post('/auth/logout', { refreshToken: tokens.refresh }).catch(() => null);
    tokens.clear();
    setUser(null);
    router.push('/login');
  }, [router]);

  const can = useCallback(
    (permission: string) => !!user?.permissions?.some((g) => grantMatches(g, permission)),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, can, refresh }),
    [user, loading, login, logout, can, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
