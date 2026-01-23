import { create } from 'zustand';

interface ModalState {
  isAddSubscriptionOpen: boolean;
  openAddSubscription: () => void;
  closeAddSubscription: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isAddSubscriptionOpen: false,
  openAddSubscription: () => set({ isAddSubscriptionOpen: true }),
  closeAddSubscription: () => set({ isAddSubscriptionOpen: false }),
}));
