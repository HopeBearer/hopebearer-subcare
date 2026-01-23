import {
  UserRole,
  UserDTO,
  LoginParams,
  RegisterParams,
  ForgotPasswordParams,
  AuthResponse,
  CaptchaResponse,
  ApiResponse,
  CreateSubscriptionDTO,
  UpdateSubscriptionDTO,
  SubscriptionDTO,
  Money,
  ExpenseStats,
  SubscriptionStats,
  BudgetStats,
  RenewalStats,
  DashboardStatsResponse
} from './index';

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
  captchaId?: string;
  captchaCode?: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  name?: string;
}

export interface ForgotPasswordParams {
  email: string;
}

export interface AuthResponse {
  user: UserDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface CaptchaResponse {
  captchaId: string;
  captchaImage: string; // SVG data or base64
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
  category?: string;
  description?: string;
  icon?: string;
  paymentMethod?: string;
  autoRenewal?: boolean;
  enableNotification?: boolean;
  notifyDaysBefore?: number;
  website?: string;
  notes?: string;
}

export interface UpdateSubscriptionDTO {
  name?: string;
  price?: number;
  currency?: string;
  billingCycle?: string;
  nextPayment?: Date | string;
  status?: string;
  category?: string;
  description?: string;
  icon?: string;
  paymentMethod?: string;
  autoRenewal?: boolean;
  enableNotification?: boolean;
  notifyDaysBefore?: number;
  website?: string;
  notes?: string;
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
  category: string;
  icon?: string | null;
  description?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  paymentMethod?: string | null;
  autoRenewal: boolean;
  enableNotification: boolean;
  notifyDaysBefore?: number | null;
  website?: string | null;
  notes?: string | null;
}

export interface SubscriptionFilterDTO {
  search?: string;
  status?: string;
  category?: string;
  billingCycle?: string;
  page?: number;
  limit?: number;
}

// Dashboard Stats Types
export interface Money {
  amount: number;
  currency: string;
  formatted: string;
}

export interface ExpenseStats {
  total: Money;
  trend: {
    percentage: number;
    direction: 'up' | 'down' | 'flat';
    diffAmount: Money;
  };
  history: number[];
}

export interface SubscriptionStats {
  activeCount: number;
  newCount: number;
  categories: {
    id: string;
    name: string;
    percentage: number;
    color?: string;
  }[];
}

export interface BudgetStats {
  totalLimit: Money;
  remaining: Money;
  usedPercentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

export interface RenewalStats {
  upcomingCount: number;
  daysThreshold: number;
  nextRenewal: {
    name: string;
    price: Money;
    cycle: string;
    daysRemaining: number;
  } | null;
}

export interface DashboardStatsResponse {
  expenses: ExpenseStats;
  subscriptions: SubscriptionStats;
  budget: BudgetStats;
  renewals: RenewalStats;
}

export interface ExpenseTrendData {
  labels: string[];
  values: number[];
  currency: string;
}

export interface CategoryDistributionItem {
  id: string;
  name: string;
  value: number;     // Total amount (monthly equivalent)
  percentage: number; // Percentage of total amount
  count: number;     // Number of subscriptions
  color?: string;
}

export type CategoryDistributionData = CategoryDistributionItem[];
