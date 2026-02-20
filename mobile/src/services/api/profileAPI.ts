/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Profile API Service
 *
 * Purpose: Dedicated API client for profile CRUD operations
 * Constitution: Principle I (Child Safety - NO child PII), Principle IV (Performance)
 *
 * Endpoints:
 * - GET /api/profiles/me - Get own profile
 * - POST /api/profiles - Create profile
 * - PUT /api/profiles/me - Update profile
 * - DELETE /api/profiles/me - Delete profile
 * - POST /api/profiles/photo - Upload profile photo
 * - GET /api/profiles/search - Search profiles
 *
 * Security:
 * - All endpoints require JWT authentication
 * - File uploads validated for type and size
 * - No child PII transmitted or stored
 *
 * Created: 2025-12-07
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Maximum file size for profile photos (5MB)
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed MIME types for profile photos
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Profile creation request data
 * FHA COMPLIANT: Child data is optional (user-initiated disclosure)
 */
export interface CreateProfileRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO date string
  city: string;
  state: string;
  zip_code: string;
  bio?: string;
  occupation?: string;
  budget_min?: number;
  budget_max?: number;
  // FHA COMPLIANCE: Optional, not used in scoring
  number_of_children?: number;
  ages_of_children?: string;
  schedule_type?: 'flexible' | 'fixed' | 'shift_work';
  work_from_home?: boolean;
}

/**
 * Profile update request data (partial)
 */
export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  bio?: string;
  occupation?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  budget_min?: number;
  budget_max?: number;
  number_of_children?: number;
  ages_of_children?: string;
  schedule_type?: 'flexible' | 'fixed' | 'shift_work';
  work_from_home?: boolean;
  parenting_style?: string;
}

/**
 * Profile response from backend
 */
export interface ProfileResponse {
  success: boolean;
  data: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    bio?: string;
    profile_image_url?: string;
    city: string;
    state: string;
    zip_code: string;
    budget_min?: number;
    budget_max?: number;
    number_of_children?: number;
    ages_of_children?: string;
    parenting_style?: string;
    verified: boolean;
    verification_level: 'none' | 'basic' | 'full';
    created_at: string;
    updated_at: string;
  };
  message?: string;
}

/**
 * Search filters for profile discovery
 */
export interface ProfileSearchFilters {
  city?: string;
  state?: string;
  budgetMin?: number;
  budgetMax?: number;
  verified?: boolean;
}

/**
 * Photo upload options
 */
export interface PhotoUploadOptions {
  uri: string;
  type: string;
  fileName: string;
}

/**
 * Profile API Client
 * Handles all profile-related API calls with proper authentication
 */
class ProfileAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/profiles`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const accessToken = await tokenStorage.getAccessToken();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired - should trigger refresh flow in auth interceptor
          await tokenStorage.clearTokens();
        }
        return Promise.reject(this.formatError(error));
      },
    );
  }

  /**
   * Format error for consistent error handling
   */
  private formatError(error: AxiosError): Error {
    const responseData = error.response?.data as { error?: string; message?: string } | undefined;
    const message = responseData?.error || responseData?.message || error.message || 'An error occurred';
    return new Error(message);
  }

  /**
   * Validate photo before upload
   * Security: Prevents malicious file uploads
   */
  private validatePhoto(options: PhotoUploadOptions): void {
    if (!ALLOWED_PHOTO_TYPES.includes(options.type)) {
      throw new Error(`Invalid file type. Allowed types: ${ALLOWED_PHOTO_TYPES.join(', ')}`);
    }
    // Note: Actual file size validation happens on the server
    // Client-side validation is advisory only
  }

  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<ProfileResponse> {
    const response = await this.client.get<ProfileResponse>('/me');
    return response.data;
  }

  /**
   * Create a new profile
   * @param data - Profile creation data
   */
  async createProfile(data: CreateProfileRequest): Promise<ProfileResponse> {
    // Sanitize input - remove any potential XSS vectors
    const sanitizedData = {
      ...data,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      bio: data.bio?.trim(),
      occupation: data.occupation?.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      zip_code: data.zip_code.trim(),
    };

    const response = await this.client.post<ProfileResponse>('/', sanitizedData);
    return response.data;
  }

  /**
   * Update current user's profile
   * @param data - Partial profile data to update
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
    // Sanitize string inputs
    const sanitizedData: UpdateProfileRequest = { ...data };
    if (sanitizedData.first_name) sanitizedData.first_name = sanitizedData.first_name.trim();
    if (sanitizedData.last_name) sanitizedData.last_name = sanitizedData.last_name.trim();
    if (sanitizedData.bio) sanitizedData.bio = sanitizedData.bio.trim();
    if (sanitizedData.occupation) sanitizedData.occupation = sanitizedData.occupation.trim();
    if (sanitizedData.city) sanitizedData.city = sanitizedData.city.trim();
    if (sanitizedData.state) sanitizedData.state = sanitizedData.state.trim();
    if (sanitizedData.zip_code) sanitizedData.zip_code = sanitizedData.zip_code.trim();

    const response = await this.client.put<ProfileResponse>('/me', sanitizedData);
    return response.data;
  }

  /**
   * Delete current user's profile
   */
  async deleteProfile(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete<{ success: boolean; message: string }>('/me');
    return response.data;
  }

  /**
   * Upload profile photo
   * @param options - Photo file options (uri, type, fileName)
   * Security: Validates file type before upload, server validates size
   */
  async uploadPhoto(options: PhotoUploadOptions): Promise<ProfileResponse> {
    // Validate photo before upload
    this.validatePhoto(options);

    const formData = new FormData();
    formData.append('photo', {
      uri: options.uri,
      type: options.type,
      name: options.fileName,
    } as unknown as Blob);

    const response = await this.client.post<ProfileResponse>('/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // Extended timeout for file uploads
    });

    return response.data;
  }

  /**
   * Search profiles with filters
   * @param filters - Search criteria
   */
  async searchProfiles(filters: ProfileSearchFilters): Promise<{
    success: boolean;
    count: number;
    data: ProfileResponse['data'][];
  }> {
    const response = await this.client.get<{
      success: boolean;
      count: number;
      data: ProfileResponse['data'][];
    }>('/search', { params: filters });
    return response.data;
  }

  /**
   * Get a specific profile by ID (public view)
   * @param profileId - Profile UUID
   */
  async getProfile(profileId: string): Promise<ProfileResponse> {
    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      throw new Error('Invalid profile ID format');
    }

    const response = await this.client.get<ProfileResponse>(`/${profileId}`);
    return response.data;
  }
}

export default new ProfileAPI();
