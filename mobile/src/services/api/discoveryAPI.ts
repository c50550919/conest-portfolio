/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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
 * Updated: 2026-03-01 - Use shared apiClient for JWT refresh support
 */

import apiClient from '../../config/api';

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

/**
 * Get discovery profiles with cursor-based pagination
 * @param cursor - Pagination cursor (UUID of last profile)
 * @param limit - Number of profiles to fetch (1-50, default 10)
 * @returns Discovery profiles and next cursor
 */
async function getProfiles(cursor?: string, limit: number = 10): Promise<DiscoveryResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) {
    params.cursor = cursor;
  }

  const response = await apiClient.get<{ success: boolean; data: DiscoveryResponse }>(
    '/api/discovery/profiles',
    { params },
  );

  return response.data.data; // Backend wraps response in {success, data}
}

// REMOVED: recordSwipe() - Browse-based discovery uses connection requests via /api/connections endpoint

/**
 * Report screenshot detection (child safety feature)
 * @param targetUserId - UUID of user whose profile was screenshot
 * @returns Success status
 */
async function reportScreenshot(targetUserId: string): Promise<ScreenshotResponse> {
  const response = await apiClient.post<ScreenshotResponse>('/api/discovery/screenshot', {
    targetUserId,
  });

  return response.data;
}

export default { getProfiles, reportScreenshot };
