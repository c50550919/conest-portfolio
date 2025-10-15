/**
 * Auth API Service
 *
 * Purpose: API client for authentication and authorization
 * Constitution: Principle IV (Performance - <200ms API calls P95)
 *              Principle II (Security - JWT token management, auto-refresh)
 *
 * Endpoints:
 * - POST /api/auth/register - User registration
 * - POST /api/auth/login - User login
 * - POST /api/auth/refresh - Refresh JWT token
 * - POST /api/auth/verify-phone - Phone number verification
 * - POST /api/auth/logout - User logout
 *
 * Features:
 * - Automatic JWT token refresh on 401 errors
 * - Secure token storage with react-native-keychain
 * - Request retry queue for failed auth requests
 *
 * Created: 2025-10-08
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import tokenStorage, { AuthTokens } from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://applaudably-inapprehensive-eugena.ngrok-free.dev/api';

export interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileComplete: boolean;
  };
  tokens: AuthTokens;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

export interface VerifyPhoneRequest {
  phone: string;
  code: string;
}

export interface VerifyPhoneResponse {
  verified: boolean;
  message: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Auth API Client
 * Handles all authentication-related API calls with automatic token refresh
 */
class AuthAPI {
  private client: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token to all requests
    this.client.interceptors.request.use(
      async (config) => {
        const accessToken = await tokenStorage.getAccessToken();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle 401/403 errors with automatic token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If 401 or 403 error and not already retrying
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await tokenStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Call refresh endpoint
            const { data } = await axios.post<RefreshTokenResponse>(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken }
            );

            // Save new tokens
            await tokenStorage.saveTokens(data.tokens);

            // Notify all waiting requests
            this.refreshSubscribers.forEach((callback) =>
              callback(data.tokens.accessToken)
            );
            this.refreshSubscribers = [];

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear tokens and force logout
            await tokenStorage.clearTokens();
            this.refreshSubscribers = [];
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Register new user
   * @param request - User registration data
   * @returns User profile and auth tokens
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.client.post<RegisterResponse>('/auth/register', request);

    // Save tokens to secure storage
    await tokenStorage.saveTokens(response.data.tokens);

    return response.data;
  }

  /**
   * Login user
   * @param request - Login credentials
   * @returns User profile and auth tokens
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    console.log('[AuthAPI] Login request:', { email: request.email });
    const response = await this.client.post<any>('/auth/login', request);
    console.log('[AuthAPI] Login response status:', response.status);
    console.log('[AuthAPI] Login response data:', JSON.stringify(response.data, null, 2));

    // Backend wraps response in { success, data: { user, tokens } }
    const backendData = response.data.data;
    console.log('[AuthAPI] Extracted backendData:', JSON.stringify(backendData, null, 2));

    // Extract tokens with userId from backend user.id
    const tokens: AuthTokens = {
      accessToken: backendData.tokens.accessToken,
      refreshToken: backendData.tokens.refreshToken,
      userId: backendData.user.id,
    };
    console.log('[AuthAPI] Created tokens object:', JSON.stringify(tokens, null, 2));

    // Save tokens to secure storage
    console.log('[AuthAPI] Calling tokenStorage.saveTokens...');
    const saveResult = await tokenStorage.saveTokens(tokens);
    console.log('[AuthAPI] Token save result:', saveResult);

    // Transform backend response to match mobile app expectations
    const loginResponse = {
      user: {
        id: backendData.user.id,
        email: backendData.user.email,
        firstName: backendData.user.first_name || '',
        lastName: backendData.user.last_name || '',
        profileComplete: backendData.user.profile_complete || false,
      },
      tokens,
    };
    console.log('[AuthAPI] Returning login response:', JSON.stringify(loginResponse, null, 2));
    return loginResponse;
  }

  /**
   * Refresh JWT access token
   * @returns New auth tokens
   */
  async refresh(): Promise<RefreshTokenResponse> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    });

    // Save new tokens
    await tokenStorage.saveTokens(response.data.tokens);

    return response.data;
  }

  /**
   * Verify phone number with SMS code
   * @param request - Phone number and verification code
   * @returns Verification status
   */
  async verifyPhone(request: VerifyPhoneRequest): Promise<VerifyPhoneResponse> {
    const response = await this.client.post<VerifyPhoneResponse>(
      '/auth/verify-phone',
      request
    );

    return response.data;
  }

  /**
   * Request phone verification code
   * @param phone - Phone number to verify
   * @returns Success status
   */
  async requestPhoneVerification(phone: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(
      '/auth/request-phone-verification',
      { phone }
    );

    return response.data;
  }

  /**
   * Logout user (clear tokens and invalidate session)
   * @returns Logout status
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await this.client.post<LogoutResponse>('/auth/logout');

      // Clear tokens from secure storage
      await tokenStorage.clearTokens();

      return response.data;
    } catch (error) {
      // Even if API call fails, clear local tokens
      await tokenStorage.clearTokens();
      throw error;
    }
  }

  /**
   * Check if user is authenticated (has valid tokens)
   * @returns True if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await tokenStorage.hasTokens();
  }

  /**
   * Get current user ID from stored tokens
   * @returns User ID or null
   */
  async getCurrentUserId(): Promise<string | null> {
    return await tokenStorage.getUserId();
  }
}

export default new AuthAPI();
