import { api } from '@/lib/api';
import { LoginParams, RegisterParams, AuthResponse, ApiResponse } from '@subcare/types';

// 接口版本由后端统一控制，前端只请求 /auth/*
// 如果需要特定版本，可以在 Header 中指定，或由后端路由配置决定

export const authService = {
  login: async (params: LoginParams): Promise<ApiResponse<AuthResponse>> => {
    return api.post(`/auth/login`, params);
  },

  register: async (params: RegisterParams): Promise<ApiResponse<AuthResponse>> => {
    return api.post(`/auth/register`, params);
  },
};

