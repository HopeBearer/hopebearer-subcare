import { api } from '@/lib/api';
import { 
  CreateSubscriptionDTO, 
  SubscriptionDTO, 
  SubscriptionFilterDTO,
  ApiResponse,
  DashboardStatsResponse,
  PaymentRecordDTO
} from '@subcare/types';

export const subscriptionService = {
  create: async (data: CreateSubscriptionDTO): Promise<SubscriptionDTO> => {
    const response = await api.post<any, ApiResponse<{ subscription: SubscriptionDTO }>>('/subscriptions', data);
    return response.data.subscription;
  },

  getAll: async (filters?: SubscriptionFilterDTO): Promise<{ 
    subscriptions: SubscriptionDTO[], 
    pagination: { total: number, page: number, limit: number, totalPages: number } 
  }> => {
    const response = await api.get<any, ApiResponse<{ 
      subscriptions: SubscriptionDTO[],
      pagination: { total: number, page: number, limit: number, totalPages: number }
    }>>('/subscriptions', { params: filters });
    return response.data;
  },

  update: async (id: string, data: Partial<CreateSubscriptionDTO>): Promise<SubscriptionDTO> => {
    const response = await api.patch<any, ApiResponse<{ subscription: SubscriptionDTO }>>(`/subscriptions/${id}`, data);
    return response.data.subscription;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/subscriptions/${id}`);
  },

  getStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<any, ApiResponse<{ stats: DashboardStatsResponse }>>('/subscriptions/stats');
    return response.data.stats;
  },

  getUpcomingRenewals: async (days: number = 7): Promise<SubscriptionDTO[]> => {
    const response = await api.get<any, ApiResponse<{ subscriptions: SubscriptionDTO[] }>>('/subscriptions/upcoming', {
      params: { days }
    });
    return response.data.subscriptions;
  },

  getHistory: async (
    id: string, 
    params?: { page?: number; limit?: number; search?: string; startDate?: string; endDate?: string }
  ): Promise<{ items: PaymentRecordDTO[], pagination: { total: number, page: number, limit: number, totalPages: number } }> => {
    const response = await api.get<any, ApiResponse<{ 
        history: PaymentRecordDTO[], 
        pagination: { total: number, page: number, limit: number, totalPages: number } 
    }>>(`/subscriptions/${id}/history`, { params });
    
    // Backward compatibility for old API structure if needed, or normalize response
    if (response.data.pagination) {
        return { items: response.data.history, pagination: response.data.pagination };
    }
    // Fallback if backend returns array directly (shouldn't happen with new backend code)
    return { items: response.data.history as any, pagination: { total: response.data.history.length, page: 1, limit: 1000, totalPages: 1 } };
  },

  checkConflict: async (name: string): Promise<{ conflict: boolean; existingSubscription?: SubscriptionDTO }> => {
    const response = await api.get<any, ApiResponse<{ conflict: boolean; existingSubscription?: SubscriptionDTO }>>('/subscriptions/check-conflict', {
      params: { name }
    });
    return response.data;
  },

  getNames: async (): Promise<{ name: string, icon: string | null }[]> => {
    const response = await api.get<any, ApiResponse<{ names: { name: string, icon: string | null }[] }>>('/subscriptions/names');
    // Safety check
    if (!response || !response.data || !response.data.names) {
        return [];
    }
    return response.data.names;
  }
};
