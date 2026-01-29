import { create } from 'zustand';
import { SubscriptionDTO } from '@subcare/types';

interface ModalState {
  isAddSubscriptionOpen: boolean;
  subscriptionToEdit: SubscriptionDTO | null;
  openAddSubscription: (subscription?: SubscriptionDTO) => void;
  closeAddSubscription: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isAddSubscriptionOpen: false,
  subscriptionToEdit: null,
  openAddSubscription: (subscription) => set({ isAddSubscriptionOpen: true, subscriptionToEdit: subscription || null }),
  closeAddSubscription: () => set({ isAddSubscriptionOpen: false, subscriptionToEdit: null }),
}));
