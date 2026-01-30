import { api } from '@/lib/api';
import { ApiResponse } from '@subcare/types';

export interface NotificationSetting {
  type: string;
  email: boolean;
  inApp: boolean;
}

export const notificationService = {
  getSettings: async (): Promise<NotificationSetting[]> => {
    // Assuming api.get returns the Response object (axios style)
    // The generic args are <ResBody, ResObject> if using axios wrapper, 
    // or just <ResBody> if interceptor unwraps.
    // Based on subscription.ts: 
    // const response = await api.get<any, ApiResponse<{ ... }>>(...);
    // return response.data;
    const response = await api.get<any, ApiResponse<{ data: NotificationSetting[] }>>('/notifications/settings');
    // If interceptor returns body directly (like in authService.login), check if response has .data
    // In subscription.ts: response.data.subscriptions -> implies response IS the axios object OR body has data prop?
    // Actually, look at subscription.ts: return response.data; 
    // But type is ApiResponse<{ subscriptions: ... }>.
    // So if response is AxiosResponse, response.data is the body.
    // If response IS the body, then it has .data property inside.
    
    // Let's use optional chaining to be safe against both.
    // If response is the body: response.data is the inner data array.
    // If response is AxiosResponse: response.data is the body { success: true, data: [...] }, so response.data.data is the array.
    
    // BUT looking at `authService.login`: return api.post(...) -> returns ApiResponse.
    // This suggests api.post returns the body directly?
    // Yet `subscriptionService.getAll` does `const response = await api.get... return response.data`.
    // This implies `api.get` returns AxiosResponse, so we need `.data`.
    
    if (response && 'data' in response) {
        // It's likely an Axios Response
        const body = response.data;
        // Check if body has data property (standard API format { success: true, data: ... })
        if (body && typeof body === 'object' && 'data' in body) {
            return (body as any).data || [];
        }
        return (body as any) || [];
    }
    
    // Fallback if it returned body directly
    return (response as any)?.data || [];
  },

  updateSetting: async (data: Partial<NotificationSetting> & { type: string }): Promise<NotificationSetting> => {
    const response = await api.patch<any, ApiResponse<{ data: NotificationSetting }>>('/notifications/settings', data);
    const body = response.data;
    return (body as any).data || body;
  }
};
