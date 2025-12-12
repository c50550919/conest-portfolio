/**
 * App Constants
 * Centralized configuration values
 */

export const APP_NAME = 'CoNest';

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
  ONBOARDING_COMPLETE: 'onboardingComplete',
};

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  VERIFIED: 'verified',
} as const;

export const BACKGROUND_CHECK_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  EXPIRED: 'expired',
  FAILED: 'failed',
} as const;

export const AGE_GROUPS = [
  'infant',
  'toddler',
  'preschool',
  'elementary',
  'middle-school',
  'high-school',
] as const;

export const PARENTING_STYLES = [
  'authoritative',
  'permissive',
  'attachment',
  'free-range',
  'gentle',
] as const;

export const WORK_SCHEDULES = [
  'full-time-day',
  'full-time-night',
  'part-time',
  'flexible',
  'remote',
  'shift-work',
] as const;

export const COMPATIBILITY_WEIGHTS = {
  SCHEDULE: 0.25,
  PARENTING: 0.2,
  HOUSE_RULES: 0.2,
  LOCATION: 0.15,
  BUDGET: 0.1,
  LIFESTYLE: 0.1,
};

export const MATCH_THRESHOLDS = {
  GREAT_MATCH: 70,
  GOOD_MATCH: 40,
  FAIR_MATCH: 0,
};

// CRITICAL: Privacy reminder constants
export const PRIVACY_REMINDERS = {
  NO_CHILD_DATA: 'Never share child names, photos, or specific details',
  PARENT_ONLY: 'This platform is for parent profiles only',
  VERIFICATION_REQUIRED: 'All members must complete verification',
};
