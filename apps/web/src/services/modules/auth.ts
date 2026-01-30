import { api } from '@/lib/api';
import { LoginParams, RegisterParams, ForgotPasswordParams, AuthResponse, ApiResponse, CaptchaResponse, SendVerificationCodeParams, VerifyVerificationCodeParams, ChangePasswordParams, PublicKeyResponse } from '@subcare/types';

// 接口版本由后端统一控制，前端只请求 /auth/*
// 如果需要特定版本，可以在 Header 中指定，或由后端路由配置决定

export const authService = {
  login: async (params: LoginParams): Promise<ApiResponse<AuthResponse>> => {
    return api.post(`/auth/login`, params);
  },

  register: async (params: RegisterParams): Promise<ApiResponse<AuthResponse>> => {
    return api.post(`/auth/register`, params);
  },

  forgotPassword: async (params: ForgotPasswordParams): Promise<ApiResponse<void>> => {
    return api.post(`/auth/forgot-password`, params);
  },

  verifyResetToken: async (token: string): Promise<ApiResponse<{ valid: boolean }>> => {
    return api.post(`/auth/verify-reset-token`, { token });
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse<void>> => {
    return api.post(`/auth/reset-password`, { token, password });
  },

  getCaptcha: async (): Promise<ApiResponse<CaptchaResponse>> => {
    return api.get(`/auth/captcha`);
  },

  getPublicKey: async (): Promise<ApiResponse<PublicKeyResponse>> => {
    return api.get(`/auth/public-key`);
  },

  sendRegisterVerificationCode: async (email: string): Promise<ApiResponse<void>> => {
    return api.post(`/auth/verification-code/register`, { email });
  },

  sendVerificationCode: async (email: string): Promise<ApiResponse<void>> => {
    const params: SendVerificationCodeParams = { email };
    return api.post(`/auth/verification-code/send`, params);
  },

  verifyVerificationCode: async (email: string, code: string): Promise<ApiResponse<void>> => {
    const params: VerifyVerificationCodeParams = { email, code };
    return api.post(`/auth/verification-code/verify`, params);
  },

  changePassword: async (params: ChangePasswordParams): Promise<ApiResponse<void>> => {
    return api.post(`/auth/change-password`, params);
  },
};
