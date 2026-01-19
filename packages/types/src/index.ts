export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: UserDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiResponse<T = any> {
  status: string;
  code: number;
  data: T;
  message?: string;
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
