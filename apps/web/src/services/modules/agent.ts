import { api } from '@/lib/api';
import { ApiResponse, AgentConfigDTO, RecommendationResponse, RecommendationRequest } from '@subcare/types';

export const agentService = {
  // Configure AI Provider
  configure: async (data: Omit<AgentConfigDTO, 'isActive' | 'isConfigured'>): Promise<void> => {
    await api.post('/agent/config', data);
  },

  // Get current configuration status
  getConfig: async (): Promise<AgentConfigDTO[]> => {
    const response = await api.get<any, ApiResponse<AgentConfigDTO[]>>('/agent/config');
    return response.data;
  },

  // Get AI Recommendations
  getRecommendations: async (focus?: string, forceRefresh?: boolean): Promise<RecommendationResponse> => {
    const response = await api.get<any, ApiResponse<RecommendationResponse>>('/agent/recommendations', {
      params: { focus, forceRefresh }
    });
    return response.data;
  }
};
