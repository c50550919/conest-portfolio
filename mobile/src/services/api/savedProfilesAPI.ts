/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Saved Profiles API Service
 *
 * Purpose: API client for saved profiles feature (bookmarking profiles with folders and notes)
 * Feature: 003-complete-3-critical (SavedProfile API client)
 * Task: T032
 *
 * Endpoints:
 * - POST /api/saved-profiles - Save profile with folder and notes
 * - GET /api/saved-profiles - List saved profiles with optional folder filter
 * - GET /api/saved-profiles/folders - Get profiles grouped by folder
 * - GET /api/saved-profiles/limit-status - Check 50-profile limit status
 * - GET /api/saved-profiles/compare - Compare 2-4 profiles side-by-side
 * - GET /api/saved-profiles/:id/notes - Get decrypted notes
 * - PATCH /api/saved-profiles/:id - Update folder or notes
 * - DELETE /api/saved-profiles/:id - Remove saved profile
 * - GET /api/saved-profiles/check/:profileId - Check if profile is saved
 *
 * Created: 2025-10-14
 */

import axios, { AxiosInstance } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface SavedProfile {
  id: string;
  user_id: string;
  profile_id: string;
  folder: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup' | null;
  notes_encrypted: string | null;
  notes_iv: string | null;
  saved_at: string;
  updated_at: string;
  // Profile data (joined from profiles table)
  profile?: {
    user_id: string;
    first_name: string;
    age?: number;
    city: string;
    state: string;
    verification_score: number;
  };
}

export interface SavedProfilesByFolder {
  'Top Choice': SavedProfile[];
  'Strong Maybe': SavedProfile[];
  Considering: SavedProfile[];
  Backup: SavedProfile[];
  Uncategorized: SavedProfile[];
}

export interface LimitStatus {
  current: number;
  limit: number;
  remaining: number;
  isAtLimit: boolean;
}

export interface CompareProfile {
  id: string;
  profile_id: string;
  folder: string | null;
  firstName: string;
  age: number;
  city: string;
  childrenCount: number;
  childrenAgeGroups: string[];
  compatibilityScore: number;
  budget: number;
  moveInDate: string;
  bio: string;
  profilePhoto?: string;
}

class SavedProfilesAPI {
  private client: AxiosInstance;

  constructor() {
    console.log('[SavedProfilesAPI] Initializing with API_BASE_URL:', API_BASE_URL);
    console.log('[SavedProfilesAPI] Full baseURL:', `${API_BASE_URL}/saved-profiles`);
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/saved-profiles`,
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
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('[SavedProfilesAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        console.error('[SavedProfilesAPI] Response error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        // Map backend error codes to user-friendly messages
        if (error.response?.status === 401) {
          await tokenStorage.clearTokens();
          throw new Error('Authentication required. Please log in again.');
        } else if (error.response?.status === 400) {
          const errorMessage = error.response?.data?.error || 'Invalid request';
          if (errorMessage.includes('limit')) {
            throw new Error(
              'You have reached the maximum of 50 saved profiles. Please remove some profiles to save new ones.',
            );
          }
          throw new Error(errorMessage);
        } else if (error.response?.status === 404) {
          throw new Error('Saved profile not found');
        } else if (error.response?.status === 409) {
          throw new Error('This profile is already saved');
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Save a profile to a folder with optional notes
   * @param profileId - UUID of the profile to save
   * @param folder - Folder to save to (top_choice, strong_maybe, considering, backup, or null)
   * @param notes - Optional private notes (max 1000 chars)
   * @returns Saved profile data
   */
  async saveProfile(
    profileId: string,
    folder: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup' | null = null,
    notes?: string
  ): Promise<SavedProfile> {
    const response = await this.client.post<{ success: boolean; data: SavedProfile }>('/', {
      profile_id: profileId,
      folder,
      notes,
    });

    return response.data.data;
  }

  /**
   * List all saved profiles with optional folder filter
   * @param folder - Optional folder to filter by
   * @returns Array of saved profiles
   */
  async listSavedProfiles(folder?: string): Promise<SavedProfile[]> {
    const params = folder ? { folder } : {};
    const response = await this.client.get<{ success: boolean; data: SavedProfile[] }>('/', {
      params,
    });

    return response.data.data;
  }

  /**
   * Get saved profiles grouped by folder
   * @returns Profiles organized by folder
   */
  async getSavedProfilesByFolder(): Promise<SavedProfilesByFolder> {
    const response = await this.client.get<{ success: boolean; data: SavedProfilesByFolder }>(
      '/folders',
    );
    return response.data.data;
  }

  /**
   * Get saved profile limit status (50 profile max)
   * @returns Current count and remaining slots
   */
  async getLimitStatus(): Promise<LimitStatus> {
    const response = await this.client.get<{ success: boolean; data: LimitStatus }>(
      '/limit-status',
    );
    return response.data.data;
  }

  /**
   * Compare 2-4 saved profiles side-by-side
   * @param ids - Array of 2-4 saved profile IDs
   * @returns Array of profiles with comparison data
   */
  async compareProfiles(ids: string[]): Promise<CompareProfile[]> {
    if (ids.length < 2 || ids.length > 4) {
      throw new Error('You can compare 2-4 profiles at a time');
    }

    const response = await this.client.get<{ success: boolean; data: CompareProfile[] }>(
      '/compare',
      {
        params: { ids: ids.join(',') },
      },
    );

    return response.data.data;
  }

  /**
   * Get decrypted notes for a saved profile
   * @param id - Saved profile ID
   * @returns Decrypted notes string
   */
  async getNotes(id: string): Promise<string | null> {
    const response = await this.client.get<{ success: boolean; data: { notes: string | null } }>(
      `/${id}/notes`,
    );
    return response.data.data.notes;
  }

  /**
   * Update folder or notes for a saved profile
   * @param id - Saved profile ID
   * @param folder - New folder (optional)
   * @param notes - New notes (optional)
   * @returns Updated saved profile
   */
  async updateSavedProfile(
    id: string,
    folder?: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup' | null,
    notes?: string
  ): Promise<SavedProfile> {
    const response = await this.client.patch<{ success: boolean; data: SavedProfile }>(`/${id}`, {
      folder,
      notes,
    });

    return response.data.data;
  }

  /**
   * Remove a saved profile
   * @param id - Saved profile ID
   * @returns Success status
   */
  async removeSavedProfile(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete<{ success: boolean; message: string }>(`/${id}`);
    return response.data;
  }

  /**
   * Check if a profile is saved
   * @param profileId - Profile ID to check
   * @returns Saved status and folder if saved
   */
  async checkIfSaved(
    profileId: string,
  ): Promise<{ isSaved: boolean; folder: string | null; savedProfileId: string | null }> {
    const response = await this.client.get<{
      success: boolean;
      data: { isSaved: boolean; folder: string | null; savedProfileId: string | null };
    }>(`/check/${profileId}`);

    return response.data.data;
  }
}

export default new SavedProfilesAPI();
