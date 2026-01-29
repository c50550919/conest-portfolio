/**
 * Discovery API Service
 *
 * Purpose: API client for Browse Discovery Screen (deliberate browsing, no swipes)
 * Constitution: Principle I (Child Safety - NO child PII in requests/responses)
 *
 * Endpoints:
 * - GET /api/discovery/profiles - Fetch discovery profiles with pagination
 * - POST /api/discovery/screenshot - Report screenshot detection
 *
 * Note: Browse-based discovery uses connection requests, not swipe actions
 * Created: 2025-10-06
 * Updated: 2025-10-13 - Removed swipe functionality
 */

import axios, { AxiosInstance } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface VerificationStatus {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
  fullyVerified: boolean; // All verifications complete - for badge display
}

export interface ProfileCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  childrenCount: number;
  childrenAgeGroups: ('toddler' | 'elementary' | 'teen')[];
  compatibilityScore: number;
  verificationStatus: VerificationStatus;
  budget?: number;
  moveInDate?: string;
  bio?: string;
  profilePhoto?: string;
}

export interface DiscoveryResponse {
  profiles: ProfileCard[];
  nextCursor: string | null;
}

// REMOVED: SwipeResult interface - Browse-based discovery uses connection requests

export interface ScreenshotResponse {
  success: boolean;
  message: string;
}

class DiscoveryAPI {
  private client: AxiosInstance;

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
    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await tokenStorage.getAccessToken();
        console.log(
          '[DiscoveryAPI] Token from storage:',
          token ? `${token.substring(0, 20)}...` : 'NOT FOUND',
        );
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[DiscoveryAPI] Request:', config.method?.toUpperCase(), config.url);
        } else {
          console.warn('[DiscoveryAPI] No auth token - request will fail');
        }
        return config;
      },
      (error) => {
        console.error('[DiscoveryAPI] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log('[DiscoveryAPI] Response:', response.status, response.config.url);
        return response;
      },
      async (error) => {
        console.error('[DiscoveryAPI] Response error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data,
        });
        // Note: 401/403 token refresh is handled by authAPI interceptor
        // Only clear tokens if it's a true authentication failure (not token expiry)
        if (
          error.response?.status === 401 &&
          error.response?.data?.error === 'Access token required'
        ) {
          console.warn('[DiscoveryAPI] 401 No token - clearing tokens');
          await tokenStorage.clearTokens();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get discovery profiles with cursor-based pagination
   * @param cursor - Pagination cursor (UUID of last profile)
   * @param limit - Number of profiles to fetch (1-50, default 10)
   * @returns Discovery profiles and next cursor
   */
  async getProfiles(cursor?: string, limit: number = 10): Promise<DiscoveryResponse> {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.client.get<{ success: boolean; data: DiscoveryResponse }>(
      '/discovery/profiles',
      {
        params,
      },
    );

    return response.data.data; // Backend wraps response in {success, data}
  }

  // REMOVED: recordSwipe() - Browse-based discovery uses connection requests via /api/connections endpoint

  /**
   * Report screenshot detection (child safety feature)
   * @param targetUserId - UUID of user whose profile was screenshot
   * @returns Success status
   */
  async reportScreenshot(targetUserId: string): Promise<ScreenshotResponse> {
    const response = await this.client.post<ScreenshotResponse>('/discovery/screenshot', {
      targetUserId,
    });

    return response.data;
  }
}

export default new DiscoveryAPI();
