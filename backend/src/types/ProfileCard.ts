/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * ProfileCard Type Definition
 *
 * Purpose: Type-safe profile card data for Discovery Screen
 * Constitution: Principle I (Child Safety) - CRITICAL
 *
 * ONLY childrenCount and childrenAgeGroups allowed
 * NO childrenNames, childrenPhotos, childrenAges, childrenSchools
 */

export interface VerificationStatus {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
  fullyVerified: boolean; // All verifications complete - for badge display
}

export interface ProfileCard {
  userId: string;
  firstName: string;
  age?: number; // Optional when DOB not yet provided (slim onboarding)
  city?: string; // Optional for slim onboarding users still setting up

  // CMP-12: Made optional — excluded from discovery response to prevent
  // FHA familial status discrimination. Still used internally for scoring.
  childrenCount?: number;
  childrenAgeGroups?: ('toddler' | 'elementary' | 'teen')[];

  // Matching data
  compatibilityScore: number;
  verificationStatus: VerificationStatus;

  // Housing status
  housingStatus?: 'has_room' | 'looking' | null;
  roomRentShare?: number;
  roomAvailableDate?: string;

  // Profile completion
  profileCompletion?: number;

  // Optional additional fields
  budget?: number;
  moveInDate?: string;
  bio?: string;
  profilePhoto?: string;
  openToGroupLiving?: boolean;
}

export interface DiscoveryResponse {
  profiles: ProfileCard[];
  nextCursor: string | null;
  fallbackMessage?: string;
}
