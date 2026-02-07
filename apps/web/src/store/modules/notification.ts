import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationState {
  unreadCount: number;
  localReadIds: Set<string>;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  resetUnread: () => void;
  registerLocalRead: (id: string) => void;
  consumeLocalRead: (id: string) => boolean;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      unreadCount: 0,
      localReadIds: new Set<string>(),
      setUnreadCount: (count) => set({ unreadCount: count }),
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
      resetUnread: () => set({ unreadCount: 0 }),
      registerLocalRead: (id) => {
        const next = new Set(get().localReadIds);
        next.add(id);
        set({ localReadIds: next });
      },
      consumeLocalRead: (id) => {
        const existing = get().localReadIds;
        if (!existing.has(id)) return false;
        const next = new Set(existing);
        next.delete(id);
        set({ localReadIds: next });
        return true;
      }
    }),
    {
      name: 'subcare-notification-storage',
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    }
  )
);
