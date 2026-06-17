import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { apiFetch, setAccessToken, getAccessToken } from '@/services/api';
import { Role, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    phoneNumber?: string;
    country?: string;
    examBoard?: string;
    schoolName?: string;
    studyLevel?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const res = await apiFetch<User>('/auth/me');
    if (res.ok && res.data) setUser(res.data);
    else {
      setAccessToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.ok && res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return { ok: true, role: res.data.user.role };
    }
    return { ok: false, error: res.error };
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: Role;
      phoneNumber?: string;
      country?: string;
      examBoard?: string;
      schoolName?: string;
      studyLevel?: string;
    }) => {
      const res = await apiFetch<{ user: User; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (res.ok && res.data) {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        return { ok: true };
      }
      return { ok: false, error: res.error };
    },
    []
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
