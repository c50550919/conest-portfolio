/**
 * Discovery System Type Definitions
 *
 * Purpose: Comprehensive types for browse-based discovery interface
 * Constitution: Principle I (Child Safety - NO child PII)
 *
 * Features:
 * - Filtered grid view with advanced search
 * - Saved profiles with bookmark folders
 * - Side-by-side comparison tool
 * - Detailed profile views
 * - Deliberate connection requests
 *
 * Created: 2025-10-08
 */

// ============================================================================
// Core Profile Types
// ============================================================================

export interface VerificationStatus {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
  emailVerified?: boolean;
  incomeVerified?: boolean;
}

export interface HousingPreferences {
  housingType: 'apartment' | 'house' | 'townhouse' | 'either';
  preferredNeighborhoods?: string[];
  petFriendly: boolean;
  smokeFree: boolean;
  accessibility?: 'wheelchair' | 'visual' | 'hearing' | 'none';
  bedroomCount?: number;
  bathroomCount?: number;
}

export interface ScheduleInfo {
  workSchedule: 'flexible' | 'standard' | 'shift' | 'remote' | 'evening';
  typicalWorkHours?: string; // "9am-5pm"
  weekendAvailability: boolean;
  flexibility?: 'low' | 'medium' | 'moderate' | 'high';
}

export interface ParentingInfo {
  parentingPhilosophy?: string[]; // Tags: "gentle-parenting", "structured", "attachment"
  disciplineStyle?: string[]; // Tags: "timeout", "natural-consequences", "reward-based"
  educationPriorities?: string[]; // Tags: "academics", "arts", "sports", "social"
  screenTimeApproach?: 'limited' | 'moderate' | 'flexible';
  // Alternative single-value format used by some components
  philosophy?: string;
  experience?: string;
  supportNeeds?: string[];
}

/**
 * Extended Profile Card for Browse View
 * Contains all information needed for informed decisions
 */
export interface ExtendedProfileCard {
  // Basic Info
  userId: string;
  firstName: string;
  age: number;
  gender: 'female' | 'male' | 'non-binary';
  city: string;
  state: string;
  profilePhoto: string;
  additionalPhotos?: string[]; // Up to 5 total

  // Location & Distance
  distanceMeters?: number;
  zipCode?: string; // For filtering, not display
  location?: {
    city: string;
    state: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
  };

  // Children Info (NO PII - Constitution Principle I)
  childrenCount: number;
  childrenAgeGroups: (
    | 'infant'
    | 'toddler'
    | 'elementary'
    | 'middle-school'
    | 'high-school'
    | 'teen'
  )[];

  // Verification
  verificationStatus: VerificationStatus;
  verifiedAt?: string; // When verification was completed

  // Compatibility
  compatibilityScore: number; // 0-100
  compatibilityBreakdown?: {
    schedule: number;
    parenting: number;
    location: number;
    budget: number;
    lifestyle: number;
  };

  // Housing Details
  budget: number; // Monthly rent budget
  housingBudget?: { min: number; max: number }; // Budget range alternative
  moveInDate: string; // ISO date
  desiredLeaseTerm?: number; // months
  housingPreferences: HousingPreferences;

  // Schedule & Availability
  schedule: ScheduleInfo;

  // Parenting & Lifestyle
  parenting: ParentingInfo;
  personalityTraits?: string[]; // Tags: "introverted", "organized", "spontaneous"
  interests?: string[]; // Tags: "cooking", "hiking", "reading"

  // About
  bio: string;
  lookingFor?: string; // What they're seeking in a housing partner
  dealBreakers?: string[]; // Optional transparency

  // References (visible after connection request)
  hasReferences?: boolean;
  referenceCount?: number;

  // Activity
  lastActive?: string; // ISO timestamp
  joinedDate?: string; // ISO timestamp
  responseRate?: number; // 0-100, if they've had conversations
}

// ============================================================================
// Filtering & Search Types
// ============================================================================

export type SortOption =
  | 'compatibility' // Highest match score first
  | 'distance' // Closest first
  | 'recent' // Recently active first
  | 'move-in-date'; // Soonest move-in first

export interface DiscoveryFilters {
  // Location
  maxDistance?: number; // miles
  cities?: string[];
  states?: string[];

  // Gender Preference (for living arrangement comfort)
  genderPreference?: 'any' | 'female' | 'male' | 'non-binary';

  // Budget
  budgetMin?: number;
  budgetMax?: number;

  // Children
  childrenAgeGroups?: (
    | 'infant'
    | 'toddler'
    | 'elementary'
    | 'middle-school'
    | 'high-school'
    | 'teen'
  )[];
  childrenCountMin?: number;
  childrenCountMax?: number;

  // Move-in Timeline
  moveInDateStart?: string; // ISO date
  moveInDateEnd?: string; // ISO date
  moveInDateDays?: number; // Days from now (alternative to date range)

  // Housing Type
  housingTypes?: ('apartment' | 'house' | 'townhouse' | 'either')[];
  housingType?: 'apartment' | 'house' | 'townhouse' | 'either'; // Single selection variant
  petFriendly?: boolean;
  smokeFree?: boolean;

  // Schedule
  workSchedules?: ('flexible' | 'standard' | 'shift' | 'remote' | 'evening')[];

  // Parenting
  parentingPhilosophy?: string[];

  // Verification
  requireIdVerified?: boolean;
  requireBackgroundCheck?: boolean;

  // Compatibility
  minCompatibilityScore?: number; // 0-100

  // Activity
  activeWithinDays?: number; // Only show users active in last N days
}

// ============================================================================
// Saved Profiles & Bookmarks
// ============================================================================

export type BookmarkFolder =
  | 'top-choice' // Most interested
  | 'strong-maybe' // Very interested, need more info
  | 'considering' // Interested but need to think
  | 'backup' // Keep as option
  | 'archived'; // Not interested anymore but keep record

export interface SavedProfile {
  profileId: string;
  profile: ExtendedProfileCard; // Cached profile data
  savedAt: string; // ISO timestamp
  folder: BookmarkFolder;
  notes: string; // Private notes about the profile
  tags?: string[]; // Custom tags for organization
  reminderSet?: string; // ISO timestamp for follow-up reminder
  viewCount: number; // How many times user viewed this profile
  lastViewedAt: string; // ISO timestamp
}

export interface BookmarkStats {
  total: number;
  byFolder: Record<BookmarkFolder, number>;
}

// ============================================================================
// Comparison Tool Types
// ============================================================================

export interface ComparisonProfile {
  profile: ExtendedProfileCard;
  addedAt: string; // ISO timestamp
  notes?: string;
}

export interface ComparisonSet {
  id: string; // UUID for the comparison session
  profiles: ComparisonProfile[]; // Max 3-4 profiles
  createdAt: string;
  name?: string; // Optional name like "Oakland area options"
}

// ============================================================================
// Connection Request Types
// ============================================================================

export type ConnectionRequestStatus =
  | 'pending' // Sent, awaiting response
  | 'accepted' // Other user accepted
  | 'declined' // Other user declined
  | 'withdrawn' // User withdrew request
  | 'expired'; // No response after 14 days

export interface ConnectionRequest {
  id: string;
  targetUserId: string;
  targetProfile: ExtendedProfileCard; // Snapshot at time of request
  status: ConnectionRequestStatus;
  message: string; // Personalized message (required, 50-500 chars)
  sentAt: string; // ISO timestamp
  respondedAt?: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (14 days from sentAt)
}

export interface ConnectionResponse {
  requestId: string;
  accepted: boolean;
  message?: string; // Optional response message
  matchCreated?: boolean;
  match?: {
    id: string;
    matchedUserId: string;
    compatibilityScore: number;
    createdAt: string;
  };
}

// ============================================================================
// Browse View State Types
// ============================================================================

export type BrowseViewMode =
  | 'grid' // Grid of profile cards (default)
  | 'list' // List view with more details
  | 'map'; // Map view with location markers

export interface BrowseState {
  // View Configuration
  viewMode: BrowseViewMode;
  sortBy: SortOption;
  filters: DiscoveryFilters;

  // Profile Data
  profiles: ExtendedProfileCard[];
  totalCount: number; // Total matching profiles available
  nextCursor: string | null; // For pagination

  // UI State
  loading: boolean;
  error: string | null;
  refreshing: boolean;

  // Selection
  selectedProfileIds: string[]; // For bulk actions or comparison

  // Saved Profiles
  savedProfiles: SavedProfile[];
  bookmarkStats: BookmarkStats;

  // Comparison
  comparisonProfiles: ComparisonProfile[];
  comparisonSets: ComparisonSet[];

  // Connection Requests
  sentRequests: ConnectionRequest[];
  receivedRequests: ConnectionRequest[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface BrowseProfilesRequest {
  filters: DiscoveryFilters;
  sortBy: SortOption;
  limit: number; // 12, 24, 48
  cursor?: string; // For pagination
}

export interface BrowseProfilesResponse {
  profiles: ExtendedProfileCard[];
  totalCount: number;
  nextCursor: string | null;
  filters: DiscoveryFilters; // Echo back applied filters
  appliedAt: string; // ISO timestamp
}

export interface SaveProfileRequest {
  profileId: string;
  folder: BookmarkFolder;
  notes?: string;
  tags?: string[];
}

export interface SendConnectionRequest {
  targetUserId: string;
  message: string; // Required personalized message
}

export interface RespondToConnectionRequest {
  requestId: string;
  accepted: boolean;
  message?: string;
}

// ============================================================================
// Analytics & Metrics Types
// ============================================================================

export interface BrowseAnalytics {
  profilesViewed: number;
  profilesSaved: number;
  comparisonsCreated: number;
  requestsSent: number;
  avgTimePerProfile: number; // seconds
  mostUsedFilters: string[];
  topCompatibilityScores: number[];
}
