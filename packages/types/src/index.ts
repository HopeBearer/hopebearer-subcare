export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum SubscriptionUsage {
  ALMOST_NEVER = 'Almost Never',
  OCCASIONALLY = 'Occasionally',
  NORMALLY = 'Normally',
  FREQUENTLY = 'Frequently',
  HEAVILY = 'Heavily'
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
  currency?: string;
  monthlyBudget?: number | string; // Decimal often comes as string or number
  bio?: string | null;
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
  name: string;
  verificationCode: string;
}

export interface ForgotPasswordParams {
  email: string;
}

export interface SendVerificationCodeParams {
  email: string;
}

export interface VerifyVerificationCodeParams {
  email: string;
  code: string;
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  verificationCode: string;
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

export interface PublicKeyResponse {
  publicKey: string;
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
  usage?: SubscriptionUsage;
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
  usage?: SubscriptionUsage;
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
  usage?: SubscriptionUsage | string | null;
}

export interface SubscriptionFilterDTO {
  search?: string;
  status?: string;
  category?: string;
  billingCycle?: string;
  page?: number;
  limit?: number;
  expiringInDays?: number;
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
  categoryCount: number;
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
  rules?: any; // Avoiding strict type for now
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

// Financial Analysis Types

export interface PaymentRecordDTO {
  id: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  billingDate: Date | string;
  periodStart?: Date | string;
  periodEnd?: Date | string;
  status: string;
  note?: string;
  subscriptionId: string;
  subscription?: Partial<SubscriptionDTO>; // Including basic info like name/icon
  userId: string;
  createdAt: Date | string;
}

export interface HeatmapItem {
  date: string; // YYYY-MM-DD
  count: number; // Amount or frequency intensity
}

export interface SpendingAnomaly {
  id: string;
  subscriptionId?: string; // Optional if not linked directly
  subscriptionName: string;
  type: 'PRICE_INCREASE' | 'ABNORMAL_FREQUENCY' | 'DUPLICATE';
  description: string;
  date: string | Date;
  severity: 'low' | 'medium' | 'high';
  metadata: {
    oldPrice?: number;
    newPrice?: number;
    currency?: string;
    [key: string]: any;
  };
}

export interface MonthlyProjection {
  month: string; // YYYY-MM or MMM
  amount: number;
  currency?: string;
  items?: Array<{
    subscriptionId: string;
    name: string;
    amount: number;
  }>;
}

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface FinancialOverviewDTO {
  heatmap: HeatmapItem[];
  totalExpense: number; // YTD
  projectedTotal?: number; // Next 12 months
  currency?: string;
  projection: MonthlyProjection[];
  sankey: SankeyData;
  anomalies: SpendingAnomaly[];
}

// --- Notification Types ---

export enum NotificationType {
  SYSTEM = 'system',
  BILLING = 'billing',
  SECURITY = 'security',
  MARKETING = 'marketing',
  AI = 'ai' // For future AI use
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: NotificationType | string;
  isRead: boolean;
  
  // Extended UI fields
  key?: string | null;  // i18n key
  data?: Record<string, any> | null; // i18n data
  
  link?: string | null;
  metadata?: Record<string, any> | null;
  priority: NotificationPriority | string;
  actionLabel?: string | null;

  createdAt: Date | string;
}

export interface NotificationPayload {
  userId: string;
  title?: string;
  content?: string;
  
  key?: string;            // i18n key
  data?: Record<string, any>; // i18n variables
  templateKey?: string;    // @deprecated
  templateData?: Record<string, string>; // @deprecated

  type: NotificationType;
  channels?: ('in-app' | 'email')[];
  
  // Extended
  link?: string;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
  actionLabel?: string;
}

export interface NotificationStats {
  unreadCount: number;
}

// --- AI Agent Types ---

export interface AgentConfigDTO {
  provider: 'openai' | 'deepseek' | 'anthropic';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  isActive: boolean;
  isConfigured?: boolean; // Frontend helper
}

export interface LocalizedString {
  en: string;
  zh: string;
}

export interface RecommendationItem {
  name: string;
  reason: LocalizedString;
  price: LocalizedString;
  link?: string;
  icon?: string;
}

export interface AIInsight {
  type: 'warning' | 'suggestion' | 'praise';
  title: LocalizedString;
  description: LocalizedString;
  potentialSavings?: number;
}

export interface RecommendationResponse {
  summary: LocalizedString;
  insights: AIInsight[];
  recommendations: RecommendationItem[];
}

export interface RecommendationRequest {
  focus?: 'save_money' | 'discover_tools' | 'general_audit';
}
