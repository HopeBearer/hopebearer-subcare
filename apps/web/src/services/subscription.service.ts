import { api } from '@/lib/api';
import { 
  CreateSubscriptionDTO, 
  SubscriptionDTO, 
  SubscriptionFilterDTO,
  ApiResponse,
  DashboardStatsResponse
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

  getStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<any, ApiResponse<{ stats: DashboardStatsResponse }>>('/subscriptions/stats');
    return response.data.stats;
  }
};
