import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDTO } from '@subcare/types';

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  setAuth: (user: UserDTO, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setAuth: (user, accessToken, refreshToken) => 
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      logout: () => 
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'subcare-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
