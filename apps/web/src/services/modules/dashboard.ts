import { DashboardStatsResponse, ApiResponse, ExpenseTrendData, CategoryDistributionData } from '@subcare/types';
import { api } from '@/lib/api';

export const DashboardService = {
  getStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<any, ApiResponse<DashboardStatsResponse>>('/dashboard/stats');
    return response.data;
  },

  getTrend: async (period: '6m' | '1y' | 'all'): Promise<ExpenseTrendData> => {
    const response = await api.get<any, ApiResponse<ExpenseTrendData>>('/dashboard/trend', {
      params: { period }
    });
    return response.data;
  },

  getDistribution: async (): Promise<CategoryDistributionData> => {
    const response = await api.get<any, ApiResponse<CategoryDistributionData>>('/dashboard/distribution');
    return response.data;
  }
};
