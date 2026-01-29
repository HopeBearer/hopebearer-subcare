import { api } from '@/lib/api';
import { UserDTO, ApiResponse } from '@subcare/types';

export const userService = {
  getProfile: async (): Promise<ApiResponse<{ user: UserDTO }>> => {
    return api.get('/users/profile');
  },

  updateProfile: async (data: Partial<UserDTO>): Promise<ApiResponse<{ user: UserDTO }>> => {
    return api.patch('/users/profile', data);
  }
};
