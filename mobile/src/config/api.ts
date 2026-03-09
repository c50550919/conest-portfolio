/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * API Client Configuration
 *
 * Configures axios with:
 * - Base URL for backend API (environment-aware)
 * - JWT token interceptors (auto-attach access token)
 * - Refresh token flow (401 → refresh → retry)
 * - Request/response logging
 *
 * Constitution Principles:
 * - Principle III: Security (JWT auto-refresh, secure token storage)
 * - Principle IV: Performance (<200ms API calls P95)
 *
 * Environment Configuration:
 * - Development: http://localhost:3000 (use adb reverse for Android)
 * - Production: Set in environment.ts before building release
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { getApiBaseUrl, isDevelopment } from './environment';
import { isCertificatePinningError, handlePinningFailure, shouldBlockInsecureRequests, isLockedOut, resetPinningFailures } from '../utils/certificatePinning';

// Get environment-aware API URL
const API_BASE_URL = getApiBaseUrl();

// Export for components that need the base URL directly
export const API_URL = API_BASE_URL;

// Log API URL in development for debugging
if (isDevelopment) {
  console.log(`[API] Base URL: ${API_BASE_URL}`);
}

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
 * Also blocks requests when certificate pinning is required but not configured.
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Block API requests if certificate pinning is required but pins aren't configured
    if (shouldBlockInsecureRequests()) {
      return Promise.reject(new Error(
        'Certificate pinning is not configured. API requests are blocked in production ' +
        'to prevent unprotected communication. Configure SPKI pin hashes before release.',
      ));
    }

    // Block if too many consecutive pinning failures (potential MITM)
    if (isLockedOut()) {
      return Promise.reject(new Error(
        'Too many certificate pinning failures. Connection blocked for security. ' +
        'Please switch to a trusted network and restart the app.',
      ));
    }

    try {
      // Skip auth for login/register endpoints
      if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
        console.log('[API] Skipping auth for:', config.url);
        return config;
      }

      // Retrieve access token from secure storage
      // IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
      console.log('[API] Fetching credentials from keychain for:', config.url);
      const credentials = await Keychain.getGenericPassword({ service: 'conest-auth' });
      console.log('[API] Keychain result:', {
        found: !!credentials,
        hasPassword: credentials && 'password' in credentials ? !!credentials.password : false,
      });
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password);
        const { accessToken } = parsed;
        console.log('[API] Parsed token:', {
          hasAccessToken: !!accessToken,
          tokenLength: accessToken?.length,
        });
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          console.log('[API] ✅ Authorization header attached');
        } else {
          console.warn('[API] ⚠️ No access token found in parsed credentials');
        }
      } else {
        console.warn('[API] ⚠️ No credentials found in keychain');
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
  (response) => {
    // Successful response — reset pinning failure counter
    resetPinningFailures();
    return response;
  },
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
        // IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
        const credentials = await Keychain.getGenericPassword({ service: 'conest-auth' });
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
        // IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
        await Keychain.setGenericPassword(
          'user-tokens',
          JSON.stringify({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          }),
          { service: 'conest-auth' }
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
        // IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
        await Keychain.resetGenericPassword({ service: 'conest-auth' });
        // TODO: Dispatch Redux action to navigate to login screen
        return Promise.reject(refreshError);
      }
    }

    // Detect certificate pinning failures and handle separately
    if (isCertificatePinningError(error)) {
      handlePinningFailure(error.config?.baseURL || 'unknown', error);
      return Promise.reject(new Error('Certificate pinning validation failed. Connection blocked for security.'));
    }

    return Promise.reject(error);
  }
);

/**
 * Helper: Store JWT tokens in secure storage
 * IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
 */
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Keychain.setGenericPassword('user-tokens', JSON.stringify({ accessToken, refreshToken }), {
    service: 'conest-auth',
  });
}

/**
 * Helper: Clear stored tokens (logout)
 * IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
 */
export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: 'conest-auth' });
}

/**
 * Helper: Check if user has valid tokens
 * IMPORTANT: Must match service name in tokenStorage.ts ('conest-auth')
 */
export async function hasValidTokens(): Promise<boolean> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: 'conest-auth' });
    if (!credentials) {
      return false;
    }

    const { accessToken, refreshToken } = JSON.parse(credentials.password);
    return Boolean(accessToken && refreshToken);
  } catch {
    return false;
  }
}

export default apiClient;
