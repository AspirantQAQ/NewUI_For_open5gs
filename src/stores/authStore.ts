import { create } from 'zustand';
import { getSession, login as apiLogin, logout as apiLogout } from '../services/auth';
import type { AuthSession } from '../types';

interface AuthState {
  session: AuthSession | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  initialized: false,

  init: async () => {
    try {
      const session = await getSession();
      if (session.authToken) localStorage.setItem('authToken', session.authToken);
      set({ session, loading: false, initialized: true });
    } catch {
      set({ session: null, loading: false, initialized: true });
    }
  },

  login: async (username, password) => {
    set({ loading: true });
    try {
      const session = await apiLogin(username, password);
      set({ session, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await apiLogout();
    set({ session: null });
  },
}));
