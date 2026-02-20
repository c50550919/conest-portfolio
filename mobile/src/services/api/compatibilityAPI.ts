/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Compatibility API Service
 *
 * Purpose: API client for compatibility calculation and breakdown features
 * Feature: Compatibility Breakdown Modal
 * Task: Frontend API integration
 *
 * Endpoints:
 * - POST /api/compatibility/calculate - Calculate detailed compatibility breakdown
 *
 * Created: 2025-10-30
 */

import axios, { AxiosInstance } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface CompatibilityDimension {
  dimension: string;
  score: number;
  weight: number;
  explanation: string;
  icon: string;
}

export interface CompatibilityBreakdown {
  overallScore: number;
  dimensions: CompatibilityDimension[];
  calculatedAt: string;
}

export interface CalculateCompatibilityRequest {
  profile1Id: string;
  profile2Id: string;
}

export interface CalculateCompatibilityResponse {
  success: boolean;
  data: CompatibilityBreakdown;
}

class CompatibilityAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await tokenStorage.getAccessToken();
        if (token) {
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
          // Token expired or invalid
          await tokenStorage.clearTokens();
          // Optionally trigger logout/redirect
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Calculate detailed compatibility breakdown between two profiles
   * @param profile1Id - First profile ID
   * @param profile2Id - Second profile ID
   * @returns Compatibility breakdown with 6 dimensions
   */
  async calculateCompatibility(
    profile1Id: string,
    profile2Id: string
  ): Promise<CompatibilityBreakdown> {
    try {
      console.log('[CompatibilityAPI] Calling API with:', {
        url: `${API_BASE_URL}/compatibility/calculate`,
        profile1Id,
        profile2Id,
      });

      const response = await this.client.post<CalculateCompatibilityResponse>(
        '/compatibility/calculate',
        {
          profile1Id,
          profile2Id,
        }
      );

      console.log('[CompatibilityAPI] Response received:', {
        status: response.status,
        success: response.data.success,
      });

      if (!response.data.success) {
        throw new Error('Failed to calculate compatibility');
      }

      return response.data.data;
    } catch (error) {
      console.error('[CompatibilityAPI] Error details:', {
        isAxiosError: axios.isAxiosError(error),
        message: error instanceof Error ? error.message : String(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
        code: axios.isAxiosError(error) ? error.code : undefined,
      });

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Compatibility calculation failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate compatibility for multiple profile pairs
   * Useful for batch comparison operations
   * @param pairs - Array of profile ID pairs
   * @returns Array of compatibility breakdowns
   */
  async calculateBatchCompatibility(
    pairs: Array<{ profile1Id: string; profile2Id: string }>
  ): Promise<CompatibilityBreakdown[]> {
    try {
      const requests = pairs.map((pair) =>
        this.calculateCompatibility(pair.profile1Id, pair.profile2Id)
      );
      return await Promise.all(requests);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Batch compatibility calculation failed: ${message}`);
      }
      throw error;
    }
  }
}

// Export singleton instance
export default new CompatibilityAPI();
