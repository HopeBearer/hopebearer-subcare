import { api } from '@/lib/api';
import { ApiResponse, AIProviderDTO, AIModelDTO, AIModelFilter, ModelFetchStrategy } from '@subcare/types';

// Response type for fetch models with API key
interface FetchModelsResponse {
  models: AIModelDTO[];
  strategy: ModelFetchStrategy;
  source: 'api' | 'cache';
}

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
   * Get models for a provider by ID (from cache)
   */
  getModelsByProviderId: async (providerId: string, filters?: AIModelFilter): Promise<AIModelDTO[]> => {
    const response = await api.get<any, ApiResponse<AIModelDTO[]>>(
      `/ai-providers/${providerId}/models`,
      { params: filters }
    );
    return response.data;
  },

  /**
   * Fetch models using API Key (strategy-based)
   * 
   * - DYNAMIC: Uses API Key to fetch from provider API
   * - PUBLIC/MANUAL: Returns cached models
   */
  fetchModelsWithApiKey: async (
    providerId: string, 
    apiKey: string
  ): Promise<FetchModelsResponse> => {
    const response = await api.post<any, ApiResponse<AIModelDTO[]> & { meta?: { strategy: ModelFetchStrategy; source: 'api' | 'cache' } }>(
      `/ai-providers/${providerId}/models`,
      { apiKey }
    );
    return {
      models: response.data,
      strategy: response.meta?.strategy || 'DYNAMIC',
      source: response.meta?.source || 'api'
    };
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
