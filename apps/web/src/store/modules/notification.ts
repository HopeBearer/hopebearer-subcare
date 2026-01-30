import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  resetUnread: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: count }),
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
      resetUnread: () => set({ unreadCount: 0 }),
    }),
    {
      name: 'subcare-notification-storage',
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    }
  )
);
