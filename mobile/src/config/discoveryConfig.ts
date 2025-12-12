/**
 * Discovery Configuration
 *
 * Purpose: Central configuration for browse-based discovery system
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Includes:
 * - Default filters (safety-first)
 * - Rate limits (prevent spam, encourage thoughtfulness)
 * - Saved profile quotas
 * - UI configuration
 *
 * Created: 2025-10-08
 */

import { DiscoveryFilters, SortOption, BrowseViewMode } from '../types/discovery';

// ============================================================================
// Default Filters - Safety-First Approach
// ============================================================================

/**
 * Default filters applied on first app launch
 * Prioritize safety and quality over quantity
 */
export const DEFAULT_FILTERS: DiscoveryFilters = {
  // Safety-First Defaults (CRITICAL)
  requireBackgroundCheck: true, // REQUIRED for child safety
  requireIdVerified: true, // Prevent fake profiles

  // Practical Defaults
  maxDistance: 25, // 25 miles - reasonable commute/proximity
  minCompatibilityScore: 60, // 60% minimum match quality
  activeWithinDays: 30, // Only show users active in last 30 days

  // Housing Essentials (user can override)
  smokeFree: undefined, // Let user choose
  petFriendly: undefined, // Let user choose
};

/**
 * Filter option configurations for UI
 */
export const FILTER_OPTIONS = {
  distance: {
    label: 'Maximum Distance',
    options: [
      { value: 5, label: '5 miles' },
      { value: 10, label: '10 miles' },
      { value: 25, label: '25 miles', default: true },
      { value: 50, label: '50 miles' },
      { value: 100, label: '100 miles' },
      { value: -1, label: 'Any distance' },
    ],
  },

  budget: {
    label: 'Monthly Budget',
    min: 500,
    max: 3000,
    step: 50,
    defaultMin: 800,
    defaultMax: 2000,
  },

  leaseTerm: {
    label: 'Preferred Lease Term',
    options: [
      { value: 3, label: '3 months' },
      { value: 6, label: '6 months' },
      { value: 12, label: '12 months', default: true },
      { value: 18, label: '18 months' },
      { value: 24, label: '24 months' },
    ],
  },

  moveInTimeline: {
    label: 'Move-in Timeline',
    options: [
      { value: 30, label: 'Next 30 days' },
      { value: 60, label: 'Next 60 days' },
      { value: 90, label: 'Next 90 days', default: true },
      { value: 180, label: 'Next 6 months' },
      { value: -1, label: 'Flexible' },
    ],
  },

  childrenAgeGroups: {
    label: 'Children Age Groups',
    options: [
      { value: 'infant', label: 'Infant (0-2)' },
      { value: 'toddler', label: 'Toddler (3-5)' },
      { value: 'elementary', label: 'Elementary (6-12)' },
      { value: 'teen', label: 'Teen (13-18)' },
    ],
  },

  childrenCount: {
    label: 'Number of Children',
    min: 1,
    max: 5,
    step: 1,
  },

  genderPreference: {
    label: 'Living Arrangement Preference',
    options: [
      { value: 'any', label: 'Any', default: true },
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
      { value: 'non-binary', label: 'Non-binary' },
    ],
  },

  housingType: {
    label: 'Housing Type',
    options: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'townhouse', label: 'Townhouse' },
      { value: 'either', label: 'Any type', default: true },
    ],
  },

  workSchedule: {
    label: 'Work Schedule',
    options: [
      { value: 'flexible', label: 'Flexible' },
      { value: 'standard', label: 'Standard (9-5)' },
      { value: 'shift', label: 'Shift work' },
      { value: 'remote', label: 'Remote' },
    ],
  },

  parentingPhilosophy: {
    label: 'Parenting Philosophy',
    options: [
      { value: 'gentle-parenting', label: 'Gentle Parenting' },
      { value: 'structured', label: 'Structured' },
      { value: 'attachment', label: 'Attachment Parenting' },
      { value: 'positive-discipline', label: 'Positive Discipline' },
      { value: 'montessori', label: 'Montessori-inspired' },
    ],
  },

  compatibilityScore: {
    label: 'Minimum Compatibility',
    min: 40,
    max: 90,
    step: 5,
    default: 60,
  },
};

// ============================================================================
// Sort Options Configuration
// ============================================================================

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'compatibility', label: 'Best Match' },
  { value: 'distance', label: 'Closest' },
  { value: 'recent', label: 'Recently Active' },
  { value: 'move-in-date', label: 'Soonest Move-In' },
];

export const DEFAULT_SORT: SortOption = 'compatibility';

// ============================================================================
// View Mode Configuration
// ============================================================================

export const VIEW_MODES: Array<{ value: BrowseViewMode; label: string; icon: string }> = [
  { value: 'grid', label: 'Grid', icon: 'view-grid' },
  { value: 'list', label: 'List', icon: 'view-list' },
  { value: 'map', label: 'Map', icon: 'map' },
];

export const DEFAULT_VIEW_MODE: BrowseViewMode = 'grid';

// ============================================================================
// Connection Request Limits
// ============================================================================

export const CONNECTION_REQUEST_LIMITS = {
  // Daily Limits
  maxPerDay: 5, // Max 5 connection requests per 24 hours

  // Weekly Limits
  maxPerWeek: 15, // Max 15 per 7 days

  // Monthly Limits
  maxPerMonth: 40, // Max 40 per 30 days

  // Concurrent Pending
  maxPending: 10, // Max 10 unanswered requests at once

  // Cooldown Periods
  samePersonCooldownDays: 7, // 7 days before re-requesting same person

  // Message Requirements
  minMessageLength: 50, // 50 characters minimum
  maxMessageLength: 500, // 500 characters maximum

  // Expiration
  requestExpiresAfterDays: 14, // Requests expire after 14 days

  // Grace period before expiration warning
  expirationWarningDays: 3, // Warn 3 days before expiration
} as const;

// ============================================================================
// Saved Profiles Limits
// ============================================================================

export const SAVED_PROFILE_LIMITS = {
  // Total limit across all folders
  total: 100, // Max 100 saved profiles

  // Soft warning threshold
  softWarningAt: 80, // Warn at 80% capacity (80 profiles)

  // Auto-archive suggestions
  suggestArchiveAfterDays: 60, // Suggest archiving profiles saved 60+ days ago

  // No per-folder limits (user manages organization)
  folders: {
    'top-choice': -1, // Unlimited within total
    'strong-maybe': -1,
    considering: -1,
    backup: -1,
    archived: -1,
  },
} as const;

// ============================================================================
// Comparison Tool Limits
// ============================================================================

export const COMPARISON_LIMITS = {
  maxProfiles: 4, // Max 4 profiles side-by-side
  maxSavedComparisons: 10, // Max 10 saved comparison sets
} as const;

// ============================================================================
// Profile Viewing Limits (Anti-Scraping)
// ============================================================================

export const VIEWING_LIMITS = {
  maxProfileViewsPerHour: 50, // Prevent scraping
  maxDetailedViewsPerDay: 200, // Full profile modal views
} as const;

// ============================================================================
// Search & Filter Limits (API Protection)
// ============================================================================

export const SEARCH_LIMITS = {
  maxSearchesPerMinute: 10, // Prevent API abuse
  maxFilterChangesPerMinute: 20, // Allow exploration
} as const;

// ============================================================================
// Pagination Configuration
// ============================================================================

export const PAGINATION_CONFIG = {
  // Grid view - shows 12, 24, or 48 profiles per page
  gridPageSizes: [12, 24, 48],
  defaultGridPageSize: 24,

  // List view - shows 10, 20, or 50 profiles per page
  listPageSizes: [10, 20, 50],
  defaultListPageSize: 20,

  // Prefetch threshold - load more when N items from bottom
  prefetchThreshold: 5,
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  // Grid layout
  gridColumns: {
    mobile: 1, // 1 column on mobile
    tablet: 2, // 2 columns on tablet
    desktop: 3, // 3 columns on desktop
  },

  // Card dimensions
  cardHeight: {
    grid: 380, // px
    list: 150, // px
  },

  // Animation durations
  animationDuration: {
    filter: 300, // ms
    cardHover: 200, // ms
    modalTransition: 250, // ms
  },

  // Debounce delays
  debounceDelay: {
    search: 500, // ms
    filter: 300, // ms
  },
} as const;

// ============================================================================
// Performance Targets
// ============================================================================

export const PERFORMANCE_TARGETS = {
  initialLoad: 1000, // ms - First 12 profiles
  filterApplication: 500, // ms - Apply filters
  scrollPerformance: 60, // fps - Smooth scrolling
  apiResponse: 200, // ms - P95 API response time
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURE_FLAGS = {
  enableMapView: false, // Map view (requires location permissions)
  enableComparison: true, // Side-by-side comparison
  enableSavedProfiles: true, // Bookmark system
  enableConnectionRequests: true, // Connection request flow
  enableFilterPresets: false, // Saved filter combinations (future)
  enableRecommendations: false, // ML-based recommendations (future)
} as const;

// ============================================================================
// Help Text & Tooltips
// ============================================================================

export const HELP_TEXT = {
  compatibilityScore:
    'Compatibility score is calculated based on schedule alignment, parenting philosophy, location, budget, and lifestyle factors.',

  backgroundCheck:
    'Background checks verify criminal history and sex offender registry status for child safety.',

  connectionRequest:
    'Connection requests expire after 14 days. Include a personalized message (50-500 characters) to introduce yourself.',

  savedProfiles:
    'Save profiles to review later. Organize them into folders: Top Choice, Strong Maybe, Considering, Backup, or Archived.',

  filters:
    'Filters help you find compatible housing partners. Background check and ID verification are enabled by default for safety.',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  CONNECTION_LIMIT_DAILY: "You've sent 5 connection requests today. You can send more tomorrow.",
  CONNECTION_LIMIT_WEEKLY: "You've reached your weekly limit of 15 connection requests.",
  CONNECTION_LIMIT_PENDING:
    'You have 10 pending requests. Please wait for responses before sending more.',
  CONNECTION_COOLDOWN: 'You recently sent a request to this person. Please wait {days} more days.',

  SAVED_PROFILE_LIMIT:
    "You've reached the maximum of 100 saved profiles. Archive or remove profiles to save more.",
  SAVED_PROFILE_WARNING:
    "You have {count} saved profiles (limit: 100). Consider archiving profiles you're no longer interested in.",

  MESSAGE_TOO_SHORT:
    "Your message must be at least 50 characters. Share why you'd like to connect!",
  MESSAGE_TOO_LONG: 'Your message must be 500 characters or less.',

  COMPARISON_LIMIT: 'You can compare up to 4 profiles at once. Remove a profile to add another.',

  VIEWING_LIMIT: "You've viewed many profiles recently. Please take a break and come back later.",
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  CONNECTION_REQUEST_SENT: 'Connection request sent! {name} has 14 days to respond.',
  PROFILE_SAVED: 'Profile saved to {folder}.',
  PROFILE_ARCHIVED: 'Profile archived.',
  PROFILE_REMOVED: 'Profile removed from saved.',
  COMPARISON_SAVED: 'Comparison saved for later review.',
} as const;
