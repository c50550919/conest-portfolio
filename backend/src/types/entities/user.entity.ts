/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * User Entity - Canonical Type Definitions
 *
 * Database Table: users
 * Constitution Principle III: Security - password hashing, MFA support
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type AccountStatus = 'active' | 'suspended' | 'deleted';

export interface UserDB {
  id: string;
  email: string;
  password_hash: string;
  phone?: string;
  phone_verified: boolean;
  email_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret?: string;
  account_status: AccountStatus;
  last_login?: Date;
  refresh_token_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDB {
  email: string;
  password_hash: string;
  phone?: string;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

/**
 * User API response type (safe - excludes sensitive fields)
 */
export interface User {
  id: string;
  email: string;
  phone?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  accountStatus: AccountStatus;
  lastLogin?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * User profile for the current authenticated user
 * Includes additional fields not exposed to other users
 */
export interface CurrentUser extends User {
  hasMfaSecret: boolean;
}

// =============================================================================
// Request/Response Types
// =============================================================================

export interface RegisterUserRequest {
  email: string;
  password: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  city: string;
  state: string;
  zipCode: string;
  childrenCount: number;
  childrenAgeGroups: ChildAgeGroup[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// =============================================================================
// Shared Types
// =============================================================================

export type ChildAgeGroup =
  | 'infant'
  | 'toddler'
  | 'elementary'
  | 'middle-school'
  | 'high-school'
  | 'teen';

/**
 * Standardized child age groups used across the application
 * Unified from previously inconsistent definitions
 */
export const CHILD_AGE_GROUPS: readonly ChildAgeGroup[] = [
  'infant',
  'toddler',
  'elementary',
  'middle-school',
  'high-school',
  'teen',
] as const;
