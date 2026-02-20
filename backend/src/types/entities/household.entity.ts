/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Entity - Canonical Type Definitions
 *
 * Database Tables: households, household_members, expenses
 * Constitution Principle I: Child Safety - NO child PII in household data
 * Business Model: Rent splitting and expense management with Stripe Connect
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type HouseholdStatusDB = 'active' | 'inactive';
export type MemberRoleDB = 'admin' | 'member';
export type MemberStatusDB = 'active' | 'pending' | 'inactive';
export type ExpenseTypeDB = 'rent' | 'utilities' | 'deposit' | 'other';
export type ExpenseStatusDB = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface HouseholdDB {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  monthly_rent: number; // Amount in cents
  lease_start_date?: Date;
  lease_end_date?: Date;
  stripe_account_id?: string;
  status: HouseholdStatusDB;
  created_at: Date;
  updated_at: Date;
}

export interface HouseholdMemberDB {
  id: string;
  household_id: string;
  user_id: string;
  role: MemberRoleDB;
  rent_share: number; // Amount in cents
  status: MemberStatusDB;
  joined_at: Date;
  left_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenseDB {
  id: string;
  household_id: string;
  type: ExpenseTypeDB;
  amount: number; // Amount in cents
  description?: string;
  due_date?: Date;
  status: ExpenseStatusDB;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHouseholdDB {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  monthly_rent: number;
  lease_start_date?: Date;
  lease_end_date?: Date;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

export type HouseholdStatus = 'active' | 'inactive' | 'pending' | 'dissolved';
export type MemberRole = 'admin' | 'member' | 'lease-holder' | 'co-tenant' | 'subletter';
export type MemberStatus = 'active' | 'pending' | 'inactive';
export type ExpenseType = 'rent' | 'utilities' | 'deposit' | 'other';
export type ExpenseStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

/**
 * Household API response
 */
export interface Household {
  id: string;
  name: string;

  // Address can be flat string or structured object
  address: string | HouseholdAddress;

  // Location fields (for flat address format)
  city?: string;
  state?: string;
  zipCode?: string;

  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  stripeAccountId?: string;
  status: HouseholdStatus;

  // Computed/extended fields
  totalMembers?: number;
  maxMembers?: number;
  establishedAt?: string;

  // Settings (extended feature)
  settings?: HouseholdSettings;

  createdAt: string;
  updatedAt: string;
}

export interface HouseholdAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface HouseholdSettings {
  requireApprovalForNewMembers?: boolean;
  allowGuestVisitors?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  petPolicy?: 'allowed' | 'not-allowed' | 'with-approval';
  smokingPolicy?: 'prohibited' | 'designated-area' | 'allowed';
}

/**
 * Actual database schema for households table
 * Note: This matches what's actually in PostgreSQL, which differs from HouseholdDB
 */
export interface HouseholdActualDB {
  id: string;
  name: string;
  address_encrypted: string;
  address_hash?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  monthly_rent: number;
  bedrooms: number;
  max_occupants: number;
  house_rules: string;
  lease_start_date?: Date;
  lease_end_date?: Date;
  active: boolean; // Note: boolean, not status enum
  created_at: Date;
  updated_at: Date;
}

/**
 * Household member API response
 */
export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;

  // Profile info
  firstName: string;
  lastName?: string;
  profilePhoto?: string;

  // Role and status
  role: MemberRole;
  status: MemberStatus;
  isCurrentUser?: boolean;

  // Verification
  verificationBadges?: {
    idVerified: boolean;
    backgroundCheckComplete: boolean;
    incomeVerified: boolean;
    referencesChecked: boolean;
  };
  verifiedAt?: string;

  // Children info (aggregated only)
  childrenCount?: number;
  childrenAgeGroups?: string[];

  // Housing details
  rentShare: number;
  rentSharePercentage?: number;
  moveInDate: string;
  moveOutDate?: string;

  // Payment status
  paymentStatus?: {
    currentMonth: 'paid' | 'pending' | 'overdue';
    lastPaymentDate?: string;
    nextPaymentDue: string;
  };

  // Contact info
  phone?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  joinedAt: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Expense API response
 */
export interface Expense {
  id: string;
  householdId: string;
  type: ExpenseType;
  category?: ExpenseType; // Alias for type
  amount: number;
  currency?: 'USD';
  description?: string;
  dueDate?: string;
  paidDate?: string;
  status: ExpenseStatus;
  createdBy: string;

  // Split details
  splitMethod?: 'equal' | 'percentage' | 'custom';
  splits?: ExpenseSplit[];

  // Recurring
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextOccurrence?: string;

  // Documentation
  receiptUrl?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
  paymentIntentId?: string;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateHouseholdRequest {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export interface UpdateHouseholdRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  monthlyRent?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export interface AddMemberRequest {
  userId: string;
  rentShare: number;
  role?: MemberRole;
}

export interface UpdateRentShareRequest {
  rentShare: number;
}

export interface CreateExpenseRequest {
  type: ExpenseType;
  amount: number;
  description?: string;
  dueDate?: string;
  splitMethod?: 'equal' | 'percentage' | 'custom';
  customSplits?: { userId: string; amount: number; percentage?: number }[];
  receiptUrl?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface GetExpensesQuery {
  status?: ExpenseStatus;
  type?: ExpenseType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

// =============================================================================
// Response Types
// =============================================================================

export interface GetHouseholdResponse {
  household: Household;
  members: HouseholdMember[];
}

export interface GetMembersResponse {
  members: HouseholdMember[];
  totalCount: number;
}

export interface GetExpensesResponse {
  expenses: Expense[];
  totalCount: number;
  nextCursor?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const HOUSEHOLD_CONSTANTS = {
  MAX_MEMBERS: 10,
  DEFAULT_MAX_MEMBERS: 4,
  MAX_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_RENT_CENTS: 99999999, // $999,999.99
} as const;
