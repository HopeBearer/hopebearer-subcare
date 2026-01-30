import { api } from '@/lib/api';
import { ApiResponse } from '@subcare/types';

export interface NotificationSetting {
  key: string;
  type?: string; // Legacy
  email: boolean;
  inApp: boolean;
}

export const notificationService = {
  getSettings: async (): Promise<NotificationSetting[]> => {
    const response = await api.get<any, ApiResponse<{ data: NotificationSetting[] }>>('/notifications/settings');
    
    if (response && 'data' in response) {
        const body = response.data;
        if (body && typeof body === 'object' && 'data' in body) {
            return (body as any).data || [];
        }
        return (body as any) || [];
    }
    return (response as any)?.data || [];
  },

  updateSetting: async (data: Partial<NotificationSetting> & { key: string }): Promise<NotificationSetting> => {
    const response = await api.patch<any, ApiResponse<{ data: NotificationSetting }>>('/notifications/settings', data);
    const body = response.data;
    return (body as any).data || body;
  },

  updateCategory: async (category: string, enabled: boolean, channel?: 'email' | 'inApp'): Promise<NotificationSetting[]> => {
    const response = await api.patch<any, ApiResponse<{ data: NotificationSetting[] }>>('/notifications/settings/category', { category, enabled, channel });
    const body = response.data;
    return (body as any).data || body;
  }
};
