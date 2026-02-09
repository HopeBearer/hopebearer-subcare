import { SubscriptionDTO } from '@subcare/types';

export type Subscription = SubscriptionDTO;

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
}

export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAUSED' | 'EXPIRED' | 'Active' | 'Cancelled' | 'Paused' | 'Expired';
