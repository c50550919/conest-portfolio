/**
 * Discovery API Service
 *
 * Purpose: API client for Discovery Screen (swipeable profiles)
 * Constitution: Principle I (Child Safety - NO child PII in requests/responses)
 *
 * Endpoints:
 * - GET /api/discovery/profiles - Fetch discovery profiles with pagination
 * - POST /api/discovery/swipe - Record swipe action (left/right)
 * - POST /api/discovery/screenshot - Report screenshot detection
 *
 * Created: 2025-10-06
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface VerificationStatus {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
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

export interface SwipeResult {
  swipeId: string;
  matchCreated: boolean;
  match?: {
    id: string;
    matchedUserId: string;
    compatibilityScore: number;
    createdAt: string;
  };
}

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
        const token = await AsyncStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired - handle logout
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
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
  async getProfiles(
    cursor?: string,
    limit: number = 10
  ): Promise<DiscoveryResponse> {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.client.get<DiscoveryResponse>('/discovery/profiles', {
      params,
    });

    return response.data;
  }

  /**
   * Record a swipe action (left or right)
   * @param targetUserId - UUID of user being swiped on
   * @param direction - Swipe direction ('left' or 'right')
   * @returns Swipe result with match status
   */
  async recordSwipe(
    targetUserId: string,
    direction: 'left' | 'right'
  ): Promise<SwipeResult> {
    const response = await this.client.post<SwipeResult>('/discovery/swipe', {
      targetUserId,
      direction,
    });

    return response.data;
  }

  /**
   * Report screenshot detection (child safety feature)
   * @param targetUserId - UUID of user whose profile was screenshot
   * @returns Success status
   */
  async reportScreenshot(targetUserId: string): Promise<ScreenshotResponse> {
    const response = await this.client.post<ScreenshotResponse>(
      '/discovery/screenshot',
      {
        targetUserId,
      }
    );

    return response.data;
  }
}

export default new DiscoveryAPI();
