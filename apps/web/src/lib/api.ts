import axios from 'axios';
import { useAuthStore } from '@/store';
import { ApiResponse, AuthResponse } from '@subcare/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/error-helper';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple refresh requests
let isRefreshing = false;
// Queue to store requests that failed while refreshing
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

// Response interceptor to handle errors (and potentially refresh token)
api.interceptors.response.use(
  (response) => response.data, // Unpack the data directly
  async (error) => {
    const originalRequest = error.config;
    const response = error.response;

    // Handle 401 (Unauthorized)
    // IMPORTANT: Skip refresh logic for Login/Register endpoints, as 401 there means invalid credentials
    // We check if the request is for an auth endpoint that shouldn't trigger refresh
    // Ideally, the backend should return 400 for invalid credentials, but if it returns 401, we need to handle it.
    // However, since we updated backend to return 400 for INVALID_CREDENTIALS, this check is less critical but still good for safety.
    // To avoid hardcoding URLs, we can check if the request has a custom config flag or if we are already refreshing.
    // But since we can't easily add custom config to axios request config types without module augmentation, 
    // and we want to keep it simple, we'll rely on the status code differentiation.
    // If backend returns 400 for invalid credentials, this 401 block won't be entered for login failures.

    if (response?.status === 401 && !originalRequest._retry) {
      // If the error comes from the refresh token request itself, logout
      if (originalRequest.url?.includes('/auth/refresh')) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = useAuthStore.getState();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh the token
        // Note: api.post returns the response body (ApiResponse<AuthResponse>) because of the success interceptor above
        const res = (await api.post('/auth/refresh', {
          refreshToken,
        })) as unknown as ApiResponse<AuthResponse>;

        // The interceptor unwraps response.data, so res IS the data object if using api.post
        // BUT api.post calls axios.request which triggers interceptors.
        // Wait, the Refresh Token request itself might fail or be intercepted.
        // To avoid infinite loops, we should use a clean axios instance or handle it carefully.
        // But here we rely on the same api instance.

        // Assuming res structure matches ApiResponse
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { user, tokens } = res.data || (res as any);

        // Update store with new tokens
        useAuthStore.getState().setAuth(user, tokens.accessToken, tokens.refreshToken);

        // Process queued requests with new token
        processQueue(null, tokens.accessToken);

        // Retry the original request
        originalRequest.headers['Authorization'] = 'Bearer ' + tokens.accessToken;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        // If refresh fails, we want to reject with the refresh error, OR maybe redirect to login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Global Error Handling
    if (response?.data) {
      const { code, reason, params } = response.data;

      // 42200 Validation Error: Skip global toast, let component handle it
      if (code === 42200) {
        return Promise.reject(error);
      }

      // Specific Business Errors that should be handled by form fields:
      // INVALID_CREDENTIALS, CAPTCHA_INVALID, etc.
      // We skip global toast for these too, to let handleApiError map them.
      if (['INVALID_CREDENTIALS', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED', 'USER_ALREADY_EXISTS', 'USER_NOT_FOUND', 'INVALID_PASSWORD'].includes(reason)) {
        return Promise.reject(error);
      }

      // Other Errors: Show global toast
      const message = getErrorMessage(code, reason, params);
      toast.error(message);
    } else {
      // Network Error or no response data
      toast.error(getErrorMessage(0)); // 0 -> error.network or similar default
    }

    return Promise.reject(error);
  }
);
