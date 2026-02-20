/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * useProfile Hook
 *
 * Fetches and manages the current authenticated user's profile data
 * from the backend API endpoint /api/profiles/me
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import tokenStorage from '../services/tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface UserProfile {
  // User fields
  id: string;
  email: string;

  // Parent profile fields
  firstName: string;
  lastName: string;
  displayName?: string;
  bio?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: string;
  age?: number;

  // Contact
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Children
  childrenCount: number;
  childrenAgeGroups: string[];

  // Professional
  occupation?: string;
  employer?: string;
  workFromHome?: boolean;
  workSchedule?: any;

  // Parenting & Lifestyle
  parentingStyle?: string;
  householdPreferences?: any;
  dietaryRestrictions?: string[];
  allergies?: string[];

  // Housing
  budgetMin?: number;
  budgetMax?: number;
  moveInDate?: string;
  schoolDistricts?: string[];

  // Platform metadata
  trustScore?: number;
  responseRate?: number;
  memberSince?: string;
  profileCompletion?: number;
  lastActive?: string;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await tokenStorage.getAccessToken();

      if (!token) {
        throw new Error('No access token found');
      }

      const response = await axios.get(`${API_BASE_URL}/profiles/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data && response.data.success) {
        setProfile(response.data.data);
      } else {
        throw new Error('Failed to fetch profile data');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load profile';
      setError(errorMessage);
      console.error('[useProfile] Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
};
