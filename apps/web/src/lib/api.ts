import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { ApiResponse, AuthResponse } from '@subcare/types';

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

    // Handle 401 (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        const response = (await api.post('/auth/refresh', {
          refreshToken,
        })) as ApiResponse<AuthResponse>;

        const { user, tokens } = response.data;

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
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
