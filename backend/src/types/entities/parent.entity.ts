/**
 * Parent Entity - Canonical Type Definitions
 *
 * Database Table: parents
 * Constitution Principle I: Child Safety - NO child PII, only aggregated data
 *
 * NOTE: This replaces the previous Profile model. The Parent entity is the
 * canonical representation of a user's profile in the CoNest system.
 */

import { ChildAgeGroup } from './user.entity';

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type ScheduleType = 'flexible' | 'fixed' | 'shift_work' | 'remote';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'not_started';
export type BackgroundCheckStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'consider'
  | 'expired';

export interface ParentDB {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_photo_url?: string;
  date_of_birth: Date;

  // Children info (NO PII - Constitution Principle I)
  children_count: number;
  children_age_groups: ChildAgeGroup[];

  // Location
  city?: string;
  state?: string;
  zip_code?: string;
  location?: unknown; // PostGIS geography point
  preferred_radius?: number;

  // Work & Schedule
  occupation?: string;
  employer?: string;
  work_schedule?: WorkScheduleDB;
  work_from_home?: boolean;

  // Parenting & Household
  parenting_style?: string;
  household_preferences?: HouseholdPreferencesDB;
  dietary_restrictions?: string[];
  allergies?: string[];

  // Housing
  budget_min?: number;
  budget_max?: number;
  move_in_date?: Date;
  looking_for_housing?: boolean;
  school_districts?: string[];

  // Verification
  verified_status?: VerificationStatus;
  background_check_status?: BackgroundCheckStatus;
  background_check_date?: Date;
  id_verified?: boolean;
  income_verified?: boolean;
  references_count?: number;

  // Profile metrics
  profile_completed?: boolean;
  profile_completion_percentage?: number;
  trust_score?: number;
  response_rate?: number;
  average_response_time?: number;

  created_at: Date;
  updated_at: Date;
}

export interface WorkScheduleDB {
  type: ScheduleType;
  days?: string[];
  hours?: string;
}

export interface HouseholdPreferencesDB {
  cleanliness_level?: 'very_clean' | 'moderately_clean' | 'relaxed' | 'minimal';
  noise_tolerance?: 'very_quiet' | 'moderate' | 'okay_with_noise' | 'lively';
  guest_policy?: 'often' | 'sometimes' | 'rarely' | 'never';
  sharing_preferences?: 'very_shared' | 'somewhat_shared' | 'mostly_separate';
}

export interface CreateParentDB {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | Date;
  children_count: number;
  children_age_groups: ChildAgeGroup[];
  city?: string;
  state?: string;
  zip_code?: string;
  budget_min?: number;
  budget_max?: number;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

/**
 * Full parent profile for API responses
 */
export interface Parent {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string;
  profilePhotoUrl?: string;
  dateOfBirth: string; // ISO date string
  age: number; // Computed from dateOfBirth

  // Children info
  childrenCount: number;
  childrenAgeGroups: ChildAgeGroup[];

  // Location
  city?: string;
  state?: string;
  zipCode?: string;
  preferredRadius?: number;

  // Work & Schedule
  occupation?: string;
  employer?: string;
  workSchedule?: WorkSchedule;
  workFromHome?: boolean;

  // Parenting & Household
  parentingStyle?: string;
  householdPreferences?: HouseholdPreferences;
  dietaryRestrictions?: string[];
  allergies?: string[];

  // Housing
  budgetMin?: number;
  budgetMax?: number;
  housingBudget?: { min: number; max: number }; // Convenience alias
  moveInDate?: string;
  lookingForHousing?: boolean;
  schoolDistricts?: string[];

  // Verification
  verifiedStatus?: VerificationStatus;
  backgroundCheckStatus?: BackgroundCheckStatus;
  backgroundCheckDate?: string;
  idVerified?: boolean;
  incomeVerified?: boolean;
  referencesCount?: number;

  // Verification status object (for ProfileCard compatibility)
  verificationStatus?: VerificationStatusObject;

  // Profile metrics
  profileCompleted?: boolean;
  profileCompletionPercentage?: number;
  trustScore?: number;
  responseRate?: number;
  averageResponseTime?: number;

  createdAt: string;
  updatedAt: string;
}

export interface WorkSchedule {
  type: ScheduleType;
  days?: string[];
  hours?: string;
}

export interface HouseholdPreferences {
  cleanlinessLevel?: 'very_clean' | 'moderately_clean' | 'relaxed' | 'minimal';
  noiseTolerance?: 'very_quiet' | 'moderate' | 'okay_with_noise' | 'lively';
  guestPolicy?: 'often' | 'sometimes' | 'rarely' | 'never';
  sharingPreferences?: 'very_shared' | 'somewhat_shared' | 'mostly_separate';
}

export interface VerificationStatusObject {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
  emailVerified?: boolean;
  incomeVerified?: boolean;
}

// =============================================================================
// ProfileCard - Optimized for Discovery/Browse views
// =============================================================================

/**
 * Compact profile representation for discovery feed
 * Constitution: Principle I - NO child PII
 */
export interface ProfileCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  state?: string;

  // Children info (aggregated only)
  childrenCount: number;
  childrenAgeGroups: ChildAgeGroup[];

  // Matching data
  compatibilityScore: number;
  verificationStatus: VerificationStatusObject;

  // Optional fields
  budget?: number;
  housingBudget?: { min: number; max: number };
  moveInDate?: string;
  bio?: string;
  profilePhoto?: string;
}

/**
 * Extended profile card with full details for comparison view
 */
export interface ExtendedProfileCard extends ProfileCard {
  state: string;
  profilePhoto: string;
  additionalPhotos?: string[];
  gender?: 'female' | 'male' | 'non-binary';

  // Location details
  distanceMeters?: number;
  zipCode?: string;
  location?: {
    city: string;
    state: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
  };

  // Verified timestamp
  verifiedAt?: string;

  // Compatibility breakdown
  compatibilityBreakdown?: {
    schedule: number;
    parenting: number;
    location: number;
    budget: number;
    lifestyle: number;
  };

  // Housing details
  desiredLeaseTerm?: number;
  housingPreferences?: {
    housingType: 'apartment' | 'house' | 'townhouse' | 'either';
    preferredNeighborhoods?: string[];
    petFriendly: boolean;
    smokeFree: boolean;
    accessibility?: 'wheelchair' | 'visual' | 'hearing' | 'none';
    bedroomCount?: number;
    bathroomCount?: number;
  };

  // Schedule
  schedule?: {
    workSchedule: 'flexible' | 'standard' | 'shift' | 'remote' | 'evening';
    typicalWorkHours?: string;
    weekendAvailability: boolean;
    flexibility?: 'low' | 'medium' | 'moderate' | 'high';
  };

  // Parenting
  parenting?: {
    parentingPhilosophy?: string[];
    disciplineStyle?: string[];
    educationPriorities?: string[];
    screenTimeApproach?: 'limited' | 'moderate' | 'flexible';
    philosophy?: string;
    experience?: string;
    supportNeeds?: string[];
  };

  // Lifestyle
  personalityTraits?: string[];
  interests?: string[];
  hasPets?: boolean;
  smoking?: 'yes' | 'no' | 'outside' | boolean;

  // About
  lookingFor?: string;
  dealBreakers?: string[];

  // References
  hasReferences?: boolean;
  referenceCount?: number;

  // Activity
  lastActive?: string;
  joinedDate?: string;
  responseRate?: number;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateParentRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  childrenCount: number;
  childrenAgeGroups: ChildAgeGroup[];
  city?: string;
  state?: string;
  zipCode?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface UpdateParentRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePhotoUrl?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  occupation?: string;
  employer?: string;
  workSchedule?: WorkSchedule;
  workFromHome?: boolean;
  parentingStyle?: string;
  householdPreferences?: HouseholdPreferences;
  dietaryRestrictions?: string[];
  allergies?: string[];
  budgetMin?: number;
  budgetMax?: number;
  moveInDate?: string;
  lookingForHousing?: boolean;
  schoolDistricts?: string[];
}

// =============================================================================
// Response Types
// =============================================================================

export interface DiscoveryResponse {
  profiles: ProfileCard[];
  nextCursor: string | null;
  totalCount?: number;
}

export interface ProfileSearchFilters {
  maxDistance?: number;
  cities?: string[];
  states?: string[];
  genderPreference?: 'any' | 'female' | 'male' | 'non-binary';
  budgetMin?: number;
  budgetMax?: number;
  childrenAgeGroups?: ChildAgeGroup[];
  childrenCountMin?: number;
  childrenCountMax?: number;
  moveInDateStart?: string;
  moveInDateEnd?: string;
  housingTypes?: ('apartment' | 'house' | 'townhouse' | 'either')[];
  petFriendly?: boolean;
  smokeFree?: boolean;
  workSchedules?: ('flexible' | 'standard' | 'shift' | 'remote' | 'evening')[];
  parentingPhilosophy?: string[];
  requireIdVerified?: boolean;
  requireBackgroundCheck?: boolean;
  minCompatibilityScore?: number;
  activeWithinDays?: number;
}
