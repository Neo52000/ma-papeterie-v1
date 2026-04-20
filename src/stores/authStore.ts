import { create } from 'zustand';

// Phase 1 stub. Full Supabase Auth wiring (F6 compte client) lands in Phase 2.
export interface AuthUser {
  id: string;
  email: string;
  isPro: boolean;
  siret: string | null;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
