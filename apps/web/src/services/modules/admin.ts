import { api } from '@/lib/api';
import { ApiResponse } from '@subcare/types';

// ============= Types =============

export interface AdminOverviewStats {
  users: {
    total: number;
    active: number;
    newLast7d: number;
    newLast30d: number;
  };
  subscriptions: {
    total: number;
    active: number;
  };
  categories: {
    total: number;
  };
  logs: {
    total: number;
    errorsLast24h: number;
    warningsLast24h: number;
  };
  payments: {
    total: number;
    thisMonthAmount: number;
  };
  conversations: {
    total: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
}

export interface UserGrowthTrend {
  labels: string[];
  values: number[];
  cumulativeValues: number[];
}

export interface SubscriptionStatsData {
  statusDistribution: Array<{ status: string; count: number }>;
  categoryDistribution: Array<{ category: string; count: number }>;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  currency: string;
  monthlyBudget: string | number;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptions: Array<{
    id: string;
    name: string;
    price: string | number;
    currency: string;
    billingCycle: string;
    status: string;
    startDate: string;
    nextPayment: string | null;
    icon: string | null;
    createdAt: string;
  }>;
  paymentRecords: Array<{
    id: string;
    amount: string | number;
    currency: string;
    billingDate: string;
    status: string;
    createdAt: string;
  }>;
  _count: {
    subscriptions: number;
    paymentRecords: number;
    notifications: number;
    aiConfigs: number;
  };
}

export interface SystemLogItem {
  id: string;
  level: string;
  domain: string;
  action: string;
  userId: string | null;
  user: { name: string | null; email: string } | null;
  ip: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
}

export interface SystemLogFilters {
  level?: string;
  domain?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SubscriptionTemplateItem {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  searchText: string;
  category: string | null;
  icon: string | null;
  website: string | null;
  pricingPlans: Record<string, unknown> | null;
  defaultCurrency: string;
  defaultCycle: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResult {
  items: SubscriptionTemplateItem[];
  total: number;
}

export interface TemplateFormData {
  name: string;
  displayName?: string;
  description?: string;
  searchText: string;
  category?: string;
  icon?: string;
  website?: string;
  pricingPlans?: Record<string, unknown>;
  defaultCurrency?: string;
  defaultCycle?: string;
}

export interface MessageTemplateItem {
  id: string;
  key: string;
  title: string;
  content: string;
  channel: string;
}

export interface MessageTemplateFormData {
  key: string;
  title: string;
  content: string;
  channel: string;
}

// ============= Exchange Rate Types =============

export interface ExchangeRateItem {
  id: string;
  currency: string;
  rate: number;
  base: string;
  updatedAt: string;
}

export interface ExchangeRateData {
  rates: ExchangeRateItem[];
  total: number;
  lastUpdated: string | null;
}

// ============= Payment Types =============

export interface AdminPaymentItem {
  id: string;
  amount: number;
  currency: string;
  exchangeRate: number | null;
  billingDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: string;
  note: string | null;
  subscription: { name: string; icon: string | null } | null;
  user: { id: string; email: string; name: string | null } | null;
  createdAt: string;
}

export interface AdminPaymentListResult {
  items: AdminPaymentItem[];
  total: number;
  totalAmount: number;
}

export interface AdminPaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminPaymentStats {
  totalCount: number;
  totalAmount: number;
  thisMonthAmount: number;
  lastMonthAmount: number;
  statusDistribution: Array<{ status: string; count: number }>;
  currencyDistribution: Array<{ currency: string; count: number; amount: number }>;
}

// ============= Notification Types =============

export interface AdminNotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  priority: string;
  link: string | null;
  actionLabel: string | null;
  user: { id: string; email: string; name: string | null } | null;
  createdAt: string;
}

export interface AdminNotificationListResult {
  items: AdminNotificationItem[];
  total: number;
}

export interface AdminNotificationFilters {
  page?: number;
  limit?: number;
  type?: string;
  priority?: string;
  userId?: string;
  isRead?: string;
}

export interface AdminNotificationStats {
  total: number;
  unread: number;
  readRate: number;
  typeDistribution: Array<{ type: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
}

export interface BroadcastNotificationData {
  title: string;
  content: string;
  type?: string;
  priority?: string;
  link?: string;
  userIds?: string[];
}

// ============= AI Chat Types =============

export interface AdminAIChatStats {
  totalConversations: number;
  totalMessages: number;
  conversationsLast24h: number;
  messagesLast24h: number;
  conversationsLast7d: number;
  activeUsersLast7d: number;
  tokens: { total: number; avgPerMessage: number };
  roleDistribution: Array<{ role: string; count: number }>;
}

export interface AdminConversationItem {
  id: string;
  title: string;
  model: string | null;
  user: { id: string; email: string; name: string | null } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversationListResult {
  items: AdminConversationItem[];
  total: number;
}

// ============= Search Usage Types =============

export interface AdminSearchUsageStats {
  currentMonth: {
    month: string;
    count: number;
    limit: number;
    remaining: number;
    usagePercent: number;
  };
  history: Array<{ month: string; count: number; limit: number }>;
  cache: { total: number; expired: number; active: number };
}

// ============= User AI Config Types =============

export interface AdminUserAIConfigStats {
  totalConfigs: number;
  activeConfigs: number;
  providerDistribution: Array<{ provider: string; count: number }>;
}

// ============= System Settings Types =============

export interface SystemSettingItem {
  id: string;
  key: string;
  value: string;
  type: string;
  group: string;
  label: string | null;
  parsedValue: unknown;
  updatedAt: string;
}

export interface SystemSettingsData {
  settings: SystemSettingItem[];
  grouped: Record<string, SystemSettingItem[]>;
  groups: string[];
  total: number;
}

export interface SystemSettingFormData {
  key: string;
  value: string;
  type?: string;
  group?: string;
  label?: string;
}

// ============= Scheduled Job Types =============

export interface ScheduledJobItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunDuration: number | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  canTrigger: boolean;
  executionCount: number;
}

export interface JobExecutionItem {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  result: Record<string, unknown> | null;
  error: string | null;
  triggeredBy: string;
}

export interface ScheduledJobDetail extends ScheduledJobItem {
  executions: JobExecutionItem[];
  executionTotal: number;
}

export interface JobTriggerResult {
  status: string;
  duration: number;
  result?: unknown;
  error?: string;
}

// ============= Feedback Types =============

export interface FeedbackItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  status: string;
  priority: string;
  adminNote: string | null;
  user: { id: string; email: string; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResult {
  items: FeedbackItem[];
  total: number;
}

export interface FeedbackStats {
  total: number;
  statusDistribution: Array<{ status: string; count: number }>;
  typeDistribution: Array<{ type: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
}

export interface FeedbackFilters {
  type?: string;
  status?: string;
  priority?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface FeedbackCreateData {
  type: string;
  title: string;
  content: string;
  priority?: string;
}

// ============= API Analytics Types =============

export interface ApiAnalyticsOverview {
  totalRequests: number;
  last24hRequests: number;
  last7dRequests: number;
  errorCount24h: number;
  errorRate24h: number;
  levelDistribution: Array<{ level: string; count: number }>;
}

export interface ApiAnalyticsTrend {
  labels: string[];
  values: number[];
  total: number;
}

export interface ApiAnalyticsHourly {
  labels: string[];
  values: number[];
}

export interface ApiEndpointItem {
  endpoint: string;
  count: number;
}

export interface ApiErrorTrend {
  labels: string[];
  errorRates: number[];
  errorCounts: number[];
  totalCounts: number[];
}

export interface ApiTopUserItem {
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  count: number;
}

// ============= API Service =============

export const adminService = {
  // Dashboard
  getOverviewStats: async (): Promise<AdminOverviewStats> => {
    const response = await api.get<unknown, ApiResponse<AdminOverviewStats>>('/admin/stats');
    return response.data;
  },

  getUserGrowthTrend: async (days?: number): Promise<UserGrowthTrend> => {
    const response = await api.get<unknown, ApiResponse<UserGrowthTrend>>('/admin/stats/users', {
      params: { days },
    });
    return response.data;
  },

  getSubscriptionStats: async (): Promise<SubscriptionStatsData> => {
    const response = await api.get<unknown, ApiResponse<SubscriptionStatsData>>('/admin/stats/subscriptions');
    return response.data;
  },

  // User Management
  getUsers: async (): Promise<{ users: AdminUserDetail[]; meta: { total: number } }> => {
    const response = await api.get<unknown, ApiResponse<{ users: AdminUserDetail[]; meta: { total: number } }>>('/users');
    return response.data;
  },

  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    const response = await api.get<unknown, ApiResponse<AdminUserDetail>>(`/users/${id}/detail`);
    return response.data;
  },

  changeUserRole: async (id: string, role: string): Promise<{ user: AdminUserDetail }> => {
    const response = await api.patch<unknown, ApiResponse<{ user: AdminUserDetail }>>(`/users/${id}/role`, { role });
    return response.data;
  },

  disableUser: async (id: string): Promise<void> => {
    await api.patch(`/users/${id}/disable`);
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  // System Logs
  getLogs: async (filters: SystemLogFilters = {}): Promise<{ logs: SystemLogItem[]; total: number }> => {
    const response = await api.get<unknown, ApiResponse<{ items: SystemLogItem[]; total: number }>>('/system-logs', {
      params: filters,
    });
    // Backend returns { items, total }, map to { logs, total } for frontend
    const data = response.data;
    return { logs: data.items || [], total: data.total || 0 };
  },

  getLogDetail: async (id: string): Promise<SystemLogItem> => {
    const response = await api.get<unknown, ApiResponse<SystemLogItem>>(`/system-logs/${id}`);
    return response.data;
  },

  exportLogs: async (filters: SystemLogFilters = {}): Promise<void> => {
    const response = await api.get('/system-logs/export', {
      params: filters,
      responseType: 'blob',
    });
    // Download the file
    const blob = new Blob([response as unknown as BlobPart], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-logs-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Subscription Templates
  getTemplates: async (params?: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<TemplateListResult> => {
    const response = await api.get<unknown, ApiResponse<TemplateListResult>>('/templates', { params });
    return response.data;
  },

  getTemplateById: async (id: string): Promise<SubscriptionTemplateItem> => {
    const response = await api.get<unknown, ApiResponse<{ template: SubscriptionTemplateItem }>>(`/templates/${id}`);
    return response.data.template;
  },

  createTemplate: async (data: TemplateFormData): Promise<SubscriptionTemplateItem> => {
    const response = await api.post<unknown, ApiResponse<{ template: SubscriptionTemplateItem }>>('/templates', data);
    return response.data.template;
  },

  updateTemplate: async (id: string, data: Partial<TemplateFormData>): Promise<SubscriptionTemplateItem> => {
    const response = await api.patch<unknown, ApiResponse<{ template: SubscriptionTemplateItem }>>(`/templates/${id}`, data);
    return response.data.template;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  getTemplateCategories: async (): Promise<string[]> => {
    const response = await api.get<unknown, ApiResponse<{ categories: string[] }>>('/templates/categories');
    return response.data.categories;
  },

  // Message Templates
  getMessageTemplates: async (): Promise<MessageTemplateItem[]> => {
    const response = await api.get<unknown, ApiResponse<{ templates: MessageTemplateItem[] }>>('/message-templates');
    return response.data?.templates || [];
  },

  getMessageTemplateById: async (id: string): Promise<MessageTemplateItem> => {
    const response = await api.get<unknown, ApiResponse<{ template: MessageTemplateItem }>>(`/message-templates/${id}`);
    return response.data.template;
  },

  createMessageTemplate: async (data: MessageTemplateFormData): Promise<MessageTemplateItem> => {
    const response = await api.post<unknown, ApiResponse<{ template: MessageTemplateItem }>>('/message-templates', data);
    return response.data.template;
  },

  updateMessageTemplate: async (id: string, data: Partial<MessageTemplateFormData>): Promise<MessageTemplateItem> => {
    const response = await api.patch<unknown, ApiResponse<{ template: MessageTemplateItem }>>(`/message-templates/${id}`, data);
    return response.data.template;
  },

  deleteMessageTemplate: async (id: string): Promise<void> => {
    await api.delete(`/message-templates/${id}`);
  },

  // ===== Exchange Rates =====
  getExchangeRates: async (): Promise<ExchangeRateData> => {
    const response = await api.get<unknown, ApiResponse<ExchangeRateData>>('/admin/exchange-rates');
    return response.data;
  },

  syncExchangeRates: async (): Promise<ExchangeRateData> => {
    const response = await api.post<unknown, ApiResponse<ExchangeRateData>>('/admin/exchange-rates/sync');
    return response.data;
  },

  updateExchangeRate: async (id: string, rate: number): Promise<void> => {
    await api.patch(`/admin/exchange-rates/${id}`, { rate });
  },

  // ===== Payments =====
  getPaymentRecords: async (params?: AdminPaymentFilters): Promise<AdminPaymentListResult> => {
    const response = await api.get<unknown, ApiResponse<AdminPaymentListResult>>('/admin/payments', { params });
    return response.data;
  },

  getPaymentStats: async (): Promise<AdminPaymentStats> => {
    const response = await api.get<unknown, ApiResponse<AdminPaymentStats>>('/admin/payments/stats');
    return response.data;
  },

  // ===== Notifications =====
  getAdminNotifications: async (params?: AdminNotificationFilters): Promise<AdminNotificationListResult> => {
    const response = await api.get<unknown, ApiResponse<AdminNotificationListResult>>('/admin/notifications', { params });
    return response.data;
  },

  getNotificationStats: async (): Promise<AdminNotificationStats> => {
    const response = await api.get<unknown, ApiResponse<AdminNotificationStats>>('/admin/notifications/stats');
    return response.data;
  },

  broadcastNotification: async (data: BroadcastNotificationData): Promise<{ sent: number; targetUsers: number }> => {
    const response = await api.post<unknown, ApiResponse<{ sent: number; targetUsers: number }>>('/admin/notifications/broadcast', data);
    return response.data;
  },

  // ===== AI Chat =====
  getAIChatStats: async (): Promise<AdminAIChatStats> => {
    const response = await api.get<unknown, ApiResponse<AdminAIChatStats>>('/admin/ai-chat/stats');
    return response.data;
  },

  getAdminConversations: async (params?: { page?: number; limit?: number; userId?: string }): Promise<AdminConversationListResult> => {
    const response = await api.get<unknown, ApiResponse<AdminConversationListResult>>('/admin/ai-chat/conversations', { params });
    return response.data;
  },

  // ===== Search Usage =====
  getSearchUsageStats: async (): Promise<AdminSearchUsageStats> => {
    const response = await api.get<unknown, ApiResponse<AdminSearchUsageStats>>('/admin/search-usage');
    return response.data;
  },

  cleanExpiredCache: async (): Promise<{ cleaned: number }> => {
    const response = await api.post<unknown, ApiResponse<{ cleaned: number }>>('/admin/search-usage/clean-cache');
    return response.data;
  },

  updateSearchLimit: async (month: string, limit: number): Promise<void> => {
    await api.patch('/admin/search-usage/limit', { month, limit });
  },

  // ===== User AI Configs =====
  getUserAIConfigStats: async (): Promise<AdminUserAIConfigStats> => {
    const response = await api.get<unknown, ApiResponse<AdminUserAIConfigStats>>('/admin/user-ai-configs/stats');
    return response.data;
  },

  // ===== System Settings =====
  getSystemSettings: async (group?: string): Promise<SystemSettingsData> => {
    const response = await api.get<unknown, ApiResponse<SystemSettingsData>>('/admin/settings', {
      params: group ? { group } : undefined,
    });
    return response.data;
  },

  getSettingGroups: async (): Promise<string[]> => {
    const response = await api.get<unknown, ApiResponse<{ groups: string[] }>>('/admin/settings/groups');
    return response.data.groups;
  },

  upsertSetting: async (data: SystemSettingFormData): Promise<SystemSettingItem> => {
    const response = await api.put<unknown, ApiResponse<SystemSettingItem>>('/admin/settings', data);
    return response.data;
  },

  batchUpdateSettings: async (items: Array<{ key: string; value: string }>): Promise<{ updated: number }> => {
    const response = await api.patch<unknown, ApiResponse<{ updated: number }>>('/admin/settings/batch', { items });
    return response.data;
  },

  deleteSetting: async (id: string): Promise<void> => {
    await api.delete(`/admin/settings/${id}`);
  },

  // ===== Scheduled Jobs =====
  getScheduledJobs: async (): Promise<{ jobs: ScheduledJobItem[] }> => {
    const response = await api.get<unknown, ApiResponse<{ jobs: ScheduledJobItem[] }>>('/admin/jobs');
    return response.data;
  },

  getJobDetail: async (id: string, page?: number, limit?: number): Promise<ScheduledJobDetail> => {
    const response = await api.get<unknown, ApiResponse<ScheduledJobDetail>>(`/admin/jobs/${id}`, {
      params: { page, limit },
    });
    return response.data;
  },

  triggerJob: async (name: string): Promise<JobTriggerResult> => {
    const response = await api.post<unknown, ApiResponse<JobTriggerResult>>(`/admin/jobs/${name}/trigger`);
    return response.data;
  },

  toggleJob: async (id: string, isEnabled: boolean): Promise<void> => {
    await api.patch(`/admin/jobs/${id}/toggle`, { isEnabled });
  },

  // ===== Feedbacks (Admin) =====
  getFeedbacks: async (params?: FeedbackFilters): Promise<FeedbackListResult> => {
    const response = await api.get<unknown, ApiResponse<FeedbackListResult>>('/admin/feedbacks', { params });
    return response.data;
  },

  getFeedbackStats: async (): Promise<FeedbackStats> => {
    const response = await api.get<unknown, ApiResponse<FeedbackStats>>('/admin/feedbacks/stats');
    return response.data;
  },

  getFeedbackById: async (id: string): Promise<FeedbackItem> => {
    const response = await api.get<unknown, ApiResponse<FeedbackItem>>(`/admin/feedbacks/${id}`);
    return response.data;
  },

  updateFeedback: async (id: string, data: { status?: string; priority?: string; adminNote?: string }): Promise<FeedbackItem> => {
    const response = await api.patch<unknown, ApiResponse<FeedbackItem>>(`/admin/feedbacks/${id}`, data);
    return response.data;
  },

  deleteFeedback: async (id: string): Promise<void> => {
    await api.delete(`/admin/feedbacks/${id}`);
  },

  // ===== Feedbacks (User) =====
  createFeedback: async (data: FeedbackCreateData): Promise<FeedbackItem> => {
    const response = await api.post<unknown, ApiResponse<FeedbackItem>>('/feedbacks', data);
    return response.data;
  },

  getMyFeedbacks: async (page?: number, limit?: number): Promise<FeedbackListResult> => {
    const response = await api.get<unknown, ApiResponse<FeedbackListResult>>('/feedbacks', {
      params: { page, limit },
    });
    return response.data;
  },

  // ===== API Analytics =====
  getApiAnalyticsOverview: async (): Promise<ApiAnalyticsOverview> => {
    const response = await api.get<unknown, ApiResponse<ApiAnalyticsOverview>>('/admin/api-analytics/overview');
    return response.data;
  },

  getApiAnalyticsTrend: async (days?: number): Promise<ApiAnalyticsTrend> => {
    const response = await api.get<unknown, ApiResponse<ApiAnalyticsTrend>>('/admin/api-analytics/trend', {
      params: { days },
    });
    return response.data;
  },

  getApiAnalyticsHourly: async (): Promise<ApiAnalyticsHourly> => {
    const response = await api.get<unknown, ApiResponse<ApiAnalyticsHourly>>('/admin/api-analytics/hourly');
    return response.data;
  },

  getApiTopEndpoints: async (limit?: number): Promise<{ endpoints: ApiEndpointItem[] }> => {
    const response = await api.get<unknown, ApiResponse<{ endpoints: ApiEndpointItem[] }>>('/admin/api-analytics/top-endpoints', {
      params: { limit },
    });
    return response.data;
  },

  getApiErrorTrend: async (days?: number): Promise<ApiErrorTrend> => {
    const response = await api.get<unknown, ApiResponse<ApiErrorTrend>>('/admin/api-analytics/errors', {
      params: { days },
    });
    return response.data;
  },

  getApiTopUsers: async (limit?: number): Promise<{ users: ApiTopUserItem[] }> => {
    const response = await api.get<unknown, ApiResponse<{ users: ApiTopUserItem[] }>>('/admin/api-analytics/top-users', {
      params: { limit },
    });
    return response.data;
  },
};
