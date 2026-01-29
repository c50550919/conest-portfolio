/**
 * Discovery API Type Adapter
 *
 * Purpose: Transforms backend ProfileCard → frontend ExtendedProfileCard
 * Constitution: Principle I (Child Safety - maintains NO child PII)
 *
 * The backend returns a minimal ProfileCard (11 fields) for efficiency.
 * The frontend UI expects ExtendedProfileCard (36+ fields) for rich display.
 * This adapter bridges the gap with sensible defaults for missing fields.
 *
 * TODO: Expand backend to return more fields and remove defaults
 */

import { ProfileCard } from '../api/discoveryAPI';
import {
  ExtendedProfileCard,
  VerificationStatus,
  ScheduleInfo,
  ParentingInfo,
  HousingPreferences,
} from '../../types/discovery';

/**
 * Default values for fields not returned by backend
 * These will be replaced as backend is enhanced
 */
const DEFAULT_SCHEDULE: ScheduleInfo = {
  workSchedule: 'flexible',
  weekendAvailability: true,
  flexibility: 'medium',
};

const DEFAULT_PARENTING: ParentingInfo = {
  philosophy: 'balanced',
  experience: 'experienced',
  supportNeeds: [],
};

const DEFAULT_HOUSING_PREFERENCES: HousingPreferences = {
  housingType: 'either',
  petFriendly: false,
  smokeFree: true,
};

/**
 * Adapt a single backend ProfileCard to frontend ExtendedProfileCard
 *
 * @param backend - ProfileCard from discovery API
 * @returns ExtendedProfileCard with defaults for missing fields
 */
export function adaptProfileCard(backend: ProfileCard): ExtendedProfileCard {
  // Map backend childrenAgeGroups to frontend format
  // Backend uses: 'toddler' | 'elementary' | 'teen'
  // Frontend allows: 'infant' | 'toddler' | 'elementary' | 'middle-school' | 'high-school' | 'teen'
  const mappedAgeGroups = backend.childrenAgeGroups.map((group) => {
    // Direct mapping - backend types are subset of frontend types
    return group as ExtendedProfileCard['childrenAgeGroups'][number];
  });

  // Extend verification status with defaults for missing fields
  const verificationStatus: VerificationStatus = {
    idVerified: backend.verificationStatus.idVerified,
    backgroundCheckComplete: backend.verificationStatus.backgroundCheckComplete,
    phoneVerified: backend.verificationStatus.phoneVerified,
    fullyVerified: backend.verificationStatus.fullyVerified, // For badge display
    // Defaults for fields not returned by backend yet
    emailVerified: true,
    incomeVerified: false,
  };

  return {
    // Direct mappings from backend
    userId: backend.userId,
    firstName: backend.firstName,
    age: backend.age,
    city: backend.city,
    childrenCount: backend.childrenCount,
    childrenAgeGroups: mappedAgeGroups,
    compatibilityScore: backend.compatibilityScore,
    budget: backend.budget || 0,
    moveInDate: backend.moveInDate || new Date().toISOString(),
    bio: backend.bio || '',
    profilePhoto: backend.profilePhoto || `https://i.pravatar.cc/300?u=${backend.userId}`,

    // Extended verification status
    verificationStatus,

    // Required fields with defaults (backend doesn't return these yet)
    gender: 'female', // Default until backend provides
    state: 'CA', // Default until backend provides

    // Complex objects with defaults
    schedule: DEFAULT_SCHEDULE,
    parenting: DEFAULT_PARENTING,
    housingPreferences: DEFAULT_HOUSING_PREFERENCES,

    // Optional location object
    location: {
      city: backend.city,
      state: 'CA', // Default until backend provides
    },

    // Budget range based on single budget value
    housingBudget: backend.budget
      ? {
          min: Math.round(backend.budget * 0.8),
          max: Math.round(backend.budget * 1.2),
        }
      : undefined,
  };
}

/**
 * Adapt an array of backend profiles to frontend format
 *
 * @param profiles - Array of ProfileCard from discovery API
 * @returns Array of ExtendedProfileCard
 */
export function adaptProfiles(profiles: ProfileCard[]): ExtendedProfileCard[] {
  return profiles.map(adaptProfileCard);
}

/**
 * Check if a profile has minimum required data for display
 *
 * @param profile - ExtendedProfileCard to validate
 * @returns true if profile has enough data to display
 */
export function isProfileDisplayable(profile: ExtendedProfileCard): boolean {
  return !!(
    profile.userId &&
    profile.firstName &&
    profile.age > 0 &&
    profile.city &&
    profile.profilePhoto
  );
}
