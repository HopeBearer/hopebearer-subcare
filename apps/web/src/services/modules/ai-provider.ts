import { api } from '@/lib/api';
import { ApiResponse, AIProviderDTO, AIModelDTO, AIModelFilter } from '@subcare/types';

export const aiProviderService = {
  /**
   * Get all active AI providers
   */
  getProviders: async (): Promise<AIProviderDTO[]> => {
    const response = await api.get<any, ApiResponse<AIProviderDTO[]>>('/ai-providers');
    return response.data;
  },

  /**
   * Get provider by ID
   */
  getProviderById: async (id: string): Promise<AIProviderDTO> => {
    const response = await api.get<any, ApiResponse<AIProviderDTO>>(`/ai-providers/${id}`);
    return response.data;
  },

  /**
   * Get models for a provider by ID
   */
  getModelsByProviderId: async (providerId: string, filters?: AIModelFilter): Promise<AIModelDTO[]> => {
    const response = await api.get<any, ApiResponse<AIModelDTO[]>>(
      `/ai-providers/${providerId}/models`,
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get models for a provider by slug
   */
  getModelsBySlug: async (slug: string, filters?: AIModelFilter): Promise<AIModelDTO[]> => {
    const response = await api.get<any, ApiResponse<AIModelDTO[]>>(
      `/ai-providers/slug/${slug}/models`,
      { params: filters }
    );
    return response.data;
  }
};
