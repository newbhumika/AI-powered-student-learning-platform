import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api.ts';
import type { Subject, Topic, UserProfile } from '../shared/types.ts';

export interface PublicPlatformInfo {
  institutionName: string;
  allowRegistration: boolean;
  aiConfigured: boolean;
  subjects: Subject[];
  topics: Topic[];
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  publicInfo: PublicPlatformInfo;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  establishSession: (token: string, profile: UserProfile) => void;
  updateLocalUser: (profile: UserProfile) => void;
  logout: () => Promise<void>;
  refreshPublicInfo: () => Promise<void>;
}

const defaultPublicInfo: PublicPlatformInfo = {
  institutionName: 'Department of Computer Science & Engineering',
  allowRegistration: true,
  aiConfigured: true,
  subjects: [],
  topics: [],
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publicInfo, setPublicInfo] = useState<PublicPlatformInfo>(defaultPublicInfo);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = window.localStorage.getItem('sla_ui_theme_v2');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('sla_ui_theme_v2', theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const refreshPublicInfo = useCallback(async () => {
    try {
      const info = await apiRequest<PublicPlatformInfo>('/api/public/info');
      setPublicInfo(info);
    } catch {
      // Keep default info on transient load issue
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await refreshPublicInfo();
      const existingToken = getStoredToken();
      if (!existingToken) {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        const res = await apiRequest<{ user: UserProfile }>('/api/auth/me');
        if (mounted) setUser(res.user);
      } catch {
        setStoredToken(null);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [refreshPublicInfo]);

  const establishSession = useCallback((token: string, profile: UserProfile) => {
    setStoredToken(token);
    setUser(profile);
  }, []);

  const updateLocalUser = useCallback((profile: UserProfile) => {
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with local cleanup even if token already expired
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        publicInfo,
        theme,
        toggleTheme,
        establishSession,
        updateLocalUser,
        logout,
        refreshPublicInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
