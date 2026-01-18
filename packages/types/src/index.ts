export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionDTO {
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  startDate: Date | string;
  userId: string;
}

export interface UpdateSubscriptionDTO {
  name?: string;
  price?: number;
  currency?: string;
  billingCycle?: string;
  nextPayment?: Date | string;
  status?: string;
}

export interface SubscriptionDTO {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  startDate: Date;
  nextPayment?: Date | null;
  status: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
