/**
 * API Client Configuration
 *
 * Configures axios with:
 * - Base URL for backend API
 * - JWT token interceptors (auto-attach access token)
 * - Refresh token flow (401 → refresh → retry)
 * - Request/response logging
 *
 * Constitution Principles:
 * - Principle III: Security (JWT auto-refresh, secure token storage)
 * - Principle IV: Performance (<200ms API calls P95)
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

// Base URL configuration for different platforms
// Both iOS and Android can use localhost with adb reverse port forwarding
const getApiBaseUrl = (): string => {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Both platforms use localhost:3000
  // Android: Requires adb reverse tcp:3000 tcp:3000 for port forwarding
  // iOS: Works natively with localhost
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Main API client instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10s timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: Attach JWT access token
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Skip auth for login/register endpoints
      if (
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/register')
      ) {
        return config;
      }

      // Retrieve access token from secure storage
      const credentials = await Keychain.getGenericPassword({ service: 'auth' });
      if (credentials && credentials.password) {
        const { accessToken } = JSON.parse(credentials.password);
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    } catch (err) {
      console.error('❌ Failed to attach access token:', err);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle 401 (refresh token flow)
 */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retried, attempt refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for refresh to complete, then retry with new token
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Retrieve refresh token from secure storage
        const credentials = await Keychain.getGenericPassword({ service: 'auth' });
        if (!credentials) {
          throw new Error('No credentials found');
        }

        const { refreshToken } = JSON.parse(credentials.password);
        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Update stored tokens
        await Keychain.setGenericPassword(
          'user',
          JSON.stringify({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          }),
          { service: 'auth' }
        );

        // Notify waiting requests
        isRefreshing = false;
        onTokenRefreshed(newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        isRefreshing = false;
        refreshSubscribers = [];

        // Clear stored credentials and redirect to login
        await Keychain.resetGenericPassword({ service: 'auth' });
        // TODO: Dispatch Redux action to navigate to login screen
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper: Store JWT tokens in secure storage
 */
export async function storeTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await Keychain.setGenericPassword(
    'user',
    JSON.stringify({ accessToken, refreshToken }),
    { service: 'auth' }
  );
}

/**
 * Helper: Clear stored tokens (logout)
 */
export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: 'auth' });
}

/**
 * Helper: Check if user has valid tokens
 */
export async function hasValidTokens(): Promise<boolean> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: 'auth' });
    if (!credentials) return false;

    const { accessToken, refreshToken } = JSON.parse(credentials.password);
    return Boolean(accessToken && refreshToken);
  } catch {
    return false;
  }
}

export default apiClient;
