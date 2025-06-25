import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  email: string | null;
  passcode: string | null;
  isLoggedIn: boolean;
  login: (email: string, passcode: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      passcode: null,
      isLoggedIn: false,
      login: (email: string, passcode: string) => set({ email, passcode, isLoggedIn: true }),
      logout: () => set({ email: null, passcode: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);