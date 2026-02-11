import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDTO } from '@subcare/types';

// ── Cross-tab logout sync ──────────────────────────────────────────
const AUTH_CHANNEL_NAME = 'subcare-auth-sync';
const AUTH_STORAGE_KEY = 'subcare-auth';

/** Lazily-created BroadcastChannel (SSR-safe) */
let authChannel: BroadcastChannel | null = null;
function getAuthChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!authChannel && typeof BroadcastChannel !== 'undefined') {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  }
  return authChannel;
}

/**
 * Broadcast logout to other tabs and redirect to login page.
 * Called from UI handlers (Header logout button, etc.)
 */
function broadcastLogout() {
  const ch = getAuthChannel();
  if (ch) {
    ch.postMessage({ type: 'LOGOUT' });
  }
}
// ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  setAuth: (user: UserDTO, accessToken: string, refreshToken: string) => void;
  updateUser: (user: UserDTO) => void;
  /** Clear local auth state only (no cross-tab broadcast) */
  logout: () => void;
  /**
   * Logout current tab AND notify all other tabs to also logout.
   * Use this for user-initiated logout actions.
   */
  logoutWithBroadcast: () => void;
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

      updateUser: (user) => 
        set((state) => ({ user: { ...state.user, ...user } })),

      logout: () => 
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      logoutWithBroadcast: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        broadcastLogout();
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
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

// ── Listen for cross-tab logout events ─────────────────────────────
if (typeof window !== 'undefined') {
  // Primary: BroadcastChannel (same-origin, works in same tab group)
  const ch = getAuthChannel();
  if (ch) {
    ch.onmessage = (event) => {
      if (event.data?.type === 'LOGOUT') {
        useAuthStore.getState().logout();
        window.location.replace('/login');
      }
    };
  }

  // Fallback: storage event (fires when ANOTHER tab modifies localStorage)
  // Covers browsers without BroadcastChannel or edge cases
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        const state = parsed?.state;
        if (state && state.isAuthenticated === false && useAuthStore.getState().isAuthenticated) {
          useAuthStore.getState().logout();
          window.location.replace('/login');
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Also handle storage being cleared entirely (e.g. localStorage.clear())
    if (event.key === AUTH_STORAGE_KEY && event.newValue === null) {
      if (useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().logout();
        window.location.replace('/login');
      }
    }
  });
}
