/**
 * Entity Transformers - Convert between database and API formats
 *
 * Purpose: Bidirectional transformation between snake_case (DB) and camelCase (API)
 * Usage: Import specific transformers or use generic utilities
 *
 * Created: 2025-12-30
 */

import {
  UserDB,
  User,
  CurrentUser,
} from './user.entity';

import {
  ParentDB,
  Parent,
  ProfileCard,
  WorkScheduleDB,
  WorkSchedule,
  HouseholdPreferencesDB,
  HouseholdPreferences,
  VerificationStatusObject,
} from './parent.entity';

import {
  VerificationDB,
  Verification,
  VerificationStatusResponse,
} from './verification.entity';

import {
  MessageDB,
  Message,
  ConversationDB,
  Conversation,
} from './message.entity';

import {
  ConnectionRequestDB,
  ConnectionRequest,
} from './connection-request.entity';

import {
  HouseholdDB,
  Household,
  HouseholdMemberDB,
  HouseholdMember,
  ExpenseDB,
  Expense,
  HouseholdActualDB,
} from './household.entity';

import {
  MatchDB,
  Match,
  CompatibilityBreakdown,
} from './match.entity';

// =============================================================================
// Generic Utilities
// =============================================================================

/**
 * Convert snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transform object keys from snake_case to camelCase
 */
export function transformKeysToCamel<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    const value = obj[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = transformKeysToCamel(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? transformKeysToCamel(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Transform object keys from camelCase to snake_case
 */
export function transformKeysToSnake<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    const value = obj[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[snakeKey] = transformKeysToSnake(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? transformKeysToSnake(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

/**
 * Convert Date to ISO string, handling null/undefined
 */
export function dateToISOString(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date.toISOString() : String(date);
}

/**
 * Parse ISO string to Date, handling null/undefined
 */
export function parseISODate(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  return new Date(dateStr);
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// =============================================================================
// User Transformers
// =============================================================================

/**
 * Transform UserDB to User API response (excludes sensitive fields)
 */
export function userDBToAPI(db: UserDB): User {
  return {
    id: db.id,
    email: db.email,
    phone: db.phone,
    phoneVerified: db.phone_verified,
    emailVerified: db.email_verified,
    mfaEnabled: db.mfa_enabled,
    accountStatus: db.account_status,
    lastLogin: dateToISOString(db.last_login),
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

/**
 * Transform UserDB to CurrentUser API response
 */
export function userDBToCurrentUser(db: UserDB): CurrentUser {
  return {
    ...userDBToAPI(db),
    hasMfaSecret: !!db.mfa_secret,
  };
}

// =============================================================================
// Parent Transformers
// =============================================================================

/**
 * Transform WorkScheduleDB to WorkSchedule API format
 */
export function workScheduleDBToAPI(db: WorkScheduleDB | undefined): WorkSchedule | undefined {
  if (!db) return undefined;
  return {
    type: db.type,
    days: db.days,
    hours: db.hours,
  };
}

/**
 * Transform HouseholdPreferencesDB to HouseholdPreferences API format
 */
export function householdPreferencesDBToAPI(
  db: HouseholdPreferencesDB | undefined,
): HouseholdPreferences | undefined {
  if (!db) return undefined;
  return {
    cleanlinessLevel: db.cleanliness_level,
    noiseTolerance: db.noise_tolerance,
    guestPolicy: db.guest_policy,
    sharingPreferences: db.sharing_preferences,
  };
}

/**
 * Build VerificationStatusObject from parent verification fields
 */
export function buildVerificationStatus(db: ParentDB): VerificationStatusObject {
  return {
    idVerified: db.id_verified ?? false,
    backgroundCheckComplete: db.background_check_status === 'approved',
    phoneVerified: false, // Not stored in Parent, comes from User
    emailVerified: false, // Not stored in Parent, comes from User
    incomeVerified: db.income_verified ?? false,
  };
}

/**
 * Transform ParentDB to Parent API response
 */
export function parentDBToAPI(db: ParentDB): Parent {
  const age = db.date_of_birth ? calculateAge(db.date_of_birth) : 0;

  return {
    id: db.id,
    userId: db.user_id,
    firstName: db.first_name,
    lastName: db.last_name,
    bio: db.bio,
    profilePhotoUrl: db.profile_photo_url,
    dateOfBirth: dateToISOString(db.date_of_birth)!,
    age,

    childrenCount: db.children_count,
    childrenAgeGroups: db.children_age_groups,

    city: db.city,
    state: db.state,
    zipCode: db.zip_code,
    preferredRadius: db.preferred_radius,

    occupation: db.occupation,
    employer: db.employer,
    workSchedule: workScheduleDBToAPI(db.work_schedule),
    workFromHome: db.work_from_home,

    parentingStyle: db.parenting_style,
    householdPreferences: householdPreferencesDBToAPI(db.household_preferences),
    dietaryRestrictions: db.dietary_restrictions,
    allergies: db.allergies,

    budgetMin: db.budget_min,
    budgetMax: db.budget_max,
    housingBudget: db.budget_min !== undefined && db.budget_max !== undefined
      ? { min: db.budget_min, max: db.budget_max }
      : undefined,
    moveInDate: dateToISOString(db.move_in_date),
    lookingForHousing: db.looking_for_housing,
    schoolDistricts: db.school_districts,

    verifiedStatus: db.verified_status,
    backgroundCheckStatus: db.background_check_status,
    backgroundCheckDate: dateToISOString(db.background_check_date),
    idVerified: db.id_verified,
    incomeVerified: db.income_verified,
    referencesCount: db.references_count,
    verificationStatus: buildVerificationStatus(db),

    profileCompleted: db.profile_completed,
    profileCompletionPercentage: db.profile_completion_percentage,
    trustScore: db.trust_score,
    responseRate: db.response_rate,
    averageResponseTime: db.average_response_time,

    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

/**
 * Transform ParentDB to ProfileCard for discovery feed
 */
export function parentDBToProfileCard(
  db: ParentDB,
  compatibilityScore: number = 0,
): ProfileCard {
  const age = db.date_of_birth ? calculateAge(db.date_of_birth) : 0;

  return {
    userId: db.user_id,
    firstName: db.first_name,
    age,
    city: db.city ?? '',
    state: db.state,
    childrenCount: db.children_count,
    childrenAgeGroups: db.children_age_groups,
    compatibilityScore,
    verificationStatus: buildVerificationStatus(db),
    budget: db.budget_max ?? db.budget_min,
    housingBudget: db.budget_min !== undefined && db.budget_max !== undefined
      ? { min: db.budget_min, max: db.budget_max }
      : undefined,
    moveInDate: dateToISOString(db.move_in_date),
    bio: db.bio,
    profilePhoto: db.profile_photo_url,
  };
}

// =============================================================================
// Verification Transformers
// =============================================================================

/**
 * Transform VerificationDB to VerificationStatusResponse (mobile format)
 */
export function verificationDBToStatusResponse(db: VerificationDB): VerificationStatusResponse {
  return {
    emailVerified: db.email_verified,
    phoneVerified: db.phone_verified,
    idVerificationStatus: db.id_verification_status,
    backgroundCheckStatus: db.background_check_status,
    incomeVerificationStatus: db.income_verification_status,
    verificationScore: db.verification_score,
    fullyVerified: db.fully_verified,
  };
}

/**
 * Transform VerificationDB to full Verification API response
 */
export function verificationDBToAPI(db: VerificationDB): Verification {
  return {
    id: db.id,
    userId: db.user_id,
    idProvider: db.id_provider,
    backgroundProvider: db.background_provider,
    idVerificationStatus: db.id_verification_status,
    idVerificationDate: dateToISOString(db.id_verification_date),
    backgroundCheckStatus: db.background_check_status,
    backgroundCheckDate: dateToISOString(db.background_check_date),
    backgroundCheckReportId: db.background_check_report_id,
    adminReviewRequired: db.admin_review_required,
    adminReviewedBy: db.admin_reviewed_by,
    adminReviewDate: dateToISOString(db.admin_review_date),
    adminReviewNotes: db.admin_review_notes,
    incomeVerificationStatus: db.income_verification_status,
    incomeVerificationDate: dateToISOString(db.income_verification_date),
    incomeRange: db.income_range,
    phoneVerified: db.phone_verified,
    phoneVerificationDate: dateToISOString(db.phone_verification_date),
    emailVerified: db.email_verified,
    emailVerificationDate: dateToISOString(db.email_verification_date),
    verificationScore: db.verification_score,
    fullyVerified: db.fully_verified,
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

// =============================================================================
// Message Transformers
// =============================================================================

/**
 * Transform MessageDB to Message API response
 * Note: Content should be decrypted before calling this function
 */
export function messageDBToAPI(
  db: MessageDB,
  decryptedContent: string,
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' = 'sent',
): Message {
  return {
    id: db.id,
    conversationId: db.conversation_id,
    matchId: db.conversation_id, // Alias for backward compatibility
    senderId: db.sender_id,
    content: decryptedContent,
    messageType: db.message_type,
    fileUrl: db.file_url,
    read: db.read,
    readAt: dateToISOString(db.read_at),
    status: db.read ? 'read' : status,
    sentAt: dateToISOString(db.created_at)!,
    createdAt: dateToISOString(db.created_at)!,
  };
}

/**
 * Transform ConversationDB to Conversation API response
 */
export function conversationDBToAPI(
  db: ConversationDB,
  unreadCount: number = 0,
): Conversation {
  return {
    id: db.id,
    participant1Id: db.participant1_id,
    participant2Id: db.participant2_id,
    lastMessageAt: dateToISOString(db.last_message_at),
    lastMessagePreview: db.last_message_preview,
    unreadCount,
    bothVerified: db.both_verified ?? false,
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

// =============================================================================
// Connection Request Transformers
// =============================================================================

/**
 * Transform ConnectionRequestDB to ConnectionRequest API response
 * Note: Messages should be decrypted before calling this function
 */
export function connectionRequestDBToAPI(
  db: ConnectionRequestDB,
  decryptedMessage: string,
  decryptedResponseMessage?: string,
): ConnectionRequest {
  return {
    id: db.id,
    senderId: db.sender_id,
    recipientId: db.recipient_id,
    targetUserId: db.recipient_id, // Alias for mobile compatibility
    message: decryptedMessage,
    status: db.status === 'cancelled' ? 'withdrawn' : db.status, // Map cancelled -> withdrawn
    sentAt: dateToISOString(db.sent_at)!,
    expiresAt: dateToISOString(db.expires_at)!,
    responseMessage: decryptedResponseMessage,
    respondedAt: dateToISOString(db.responded_at),
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

// =============================================================================
// Household Transformers
// =============================================================================

/**
 * Transform HouseholdDB to Household API response
 */
export function householdDBToAPI(db: HouseholdDB): Household {
  return {
    id: db.id,
    name: db.name,
    address: db.address,
    city: db.city,
    state: db.state,
    zipCode: db.zip_code,
    monthlyRent: db.monthly_rent,
    leaseStartDate: dateToISOString(db.lease_start_date),
    leaseEndDate: dateToISOString(db.lease_end_date),
    stripeAccountId: db.stripe_account_id,
    status: db.status,
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

/**
 * Transform actual database household to mobile-compatible API response
 *
 * Handles the conversion of:
 * - address_encrypted + city/state/zip_code → structured address object
 * - active: boolean → status: 'active' | 'inactive'
 * - Adds computed fields: totalMembers, maxMembers, establishedAt, settings
 */
export function householdActualDBToMobileAPI(
  db: HouseholdActualDB,
  memberCount: number = 0,
): Household {
  // Build structured address object
  const address = {
    street: db.address_encrypted || '', // Note: might be encrypted, use city/state/zip for display
    city: db.city || '',
    state: db.state || '',
    zipCode: db.zip_code || '',
  };

  // Convert boolean active to status enum
  const status: 'active' | 'inactive' = db.active ? 'active' : 'inactive';

  return {
    id: db.id,
    name: db.name,
    address,
    city: db.city,
    state: db.state,
    zipCode: db.zip_code,
    monthlyRent: Number(db.monthly_rent), // Ensure it's a number, not string
    leaseStartDate: dateToISOString(db.lease_start_date) || '', // Required by mobile - empty string if missing
    leaseEndDate: dateToISOString(db.lease_end_date) || '', // Required by mobile - empty string if missing
    status,

    // Computed fields for mobile
    totalMembers: memberCount,
    maxMembers: db.max_occupants || 4, // Default to 4 if not set
    establishedAt: dateToISOString(db.created_at),

    // Default settings (can be expanded later)
    settings: {
      requireApprovalForNewMembers: true,
      allowGuestVisitors: true,
      petPolicy: 'with-approval',
      smokingPolicy: 'prohibited',
    },

    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

/**
 * Transform HouseholdMemberDB to HouseholdMember API response
 */
export function householdMemberDBToAPI(
  db: HouseholdMemberDB,
  profile?: { first_name: string; last_name?: string; profile_photo_url?: string },
): HouseholdMember {
  return {
    id: db.id,
    householdId: db.household_id,
    userId: db.user_id,
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name,
    profilePhoto: profile?.profile_photo_url,
    role: db.role,
    status: db.status,
    rentShare: db.rent_share,
    moveInDate: dateToISOString(db.joined_at)!,
    moveOutDate: dateToISOString(db.left_at),
    joinedAt: dateToISOString(db.joined_at)!,
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

/**
 * Transform ExpenseDB to Expense API response
 */
export function expenseDBToAPI(db: ExpenseDB): Expense {
  return {
    id: db.id,
    householdId: db.household_id,
    type: db.type,
    category: db.type, // Alias
    amount: db.amount,
    currency: 'USD',
    description: db.description,
    dueDate: dateToISOString(db.due_date),
    status: db.status,
    createdBy: db.created_by,
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

// =============================================================================
// Match Transformers
// =============================================================================

/**
 * Transform MatchDB to Match API response
 */
export function matchDBToAPI(db: MatchDB, currentUserId: string): Match {
  const otherUserId = db.user_id_1 === currentUserId ? db.user_id_2 : db.user_id_1;

  const scoreBreakdown: CompatibilityBreakdown = {
    schedule: db.schedule_score,
    parenting: db.parenting_score,
    rules: db.rules_score,
    houseRules: db.rules_score, // Alias
    location: db.location_score,
    budget: db.budget_score,
    lifestyle: db.lifestyle_score,
    totalScore: db.compatibility_score,
  };

  return {
    id: db.id,
    userId1: db.user_id_1,
    userId2: db.user_id_2,
    otherUserId,
    compatibilityScore: db.compatibility_score,
    scoreBreakdown,
    status: db.status,
    initiatedBy: db.initiated_by,
    responseDeadline: dateToISOString(db.response_deadline),
    matchedAt: dateToISOString(db.matched_at),
    createdAt: dateToISOString(db.created_at)!,
    updatedAt: dateToISOString(db.updated_at)!,
  };
}

// =============================================================================
// Batch Transformers
// =============================================================================

/**
 * Transform array of database records to API format
 */
export function transformArray<TDB, TAPI>(
  records: TDB[],
  transformer: (db: TDB, ...args: unknown[]) => TAPI,
  ...args: unknown[]
): TAPI[] {
  return records.map((record) => transformer(record, ...args));
}

// =============================================================================
// Request Transformers (API -> DB)
// =============================================================================

/**
 * Transform CreateParentRequest to CreateParentDB
 */
export function createParentRequestToDB(
  request: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    childrenCount: number;
    childrenAgeGroups: string[];
    city?: string;
    state?: string;
    zipCode?: string;
    budgetMin?: number;
    budgetMax?: number;
  },
  userId: string,
): {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  children_count: number;
  children_age_groups: string[];
  city?: string;
  state?: string;
  zip_code?: string;
  budget_min?: number;
  budget_max?: number;
} {
  return {
    user_id: userId,
    first_name: request.firstName,
    last_name: request.lastName,
    date_of_birth: request.dateOfBirth,
    children_count: request.childrenCount,
    children_age_groups: request.childrenAgeGroups,
    city: request.city,
    state: request.state,
    zip_code: request.zipCode,
    budget_min: request.budgetMin,
    budget_max: request.budgetMax,
  };
}

/**
 * Transform CreateHouseholdRequest to CreateHouseholdDB format
 */
export function createHouseholdRequestToDB(request: {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
}): {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  monthly_rent: number;
  lease_start_date?: Date;
  lease_end_date?: Date;
} {
  return {
    name: request.name,
    address: request.address,
    city: request.city,
    state: request.state,
    zip_code: request.zipCode,
    monthly_rent: request.monthlyRent,
    lease_start_date: request.leaseStartDate ? new Date(request.leaseStartDate) : undefined,
    lease_end_date: request.leaseEndDate ? new Date(request.leaseEndDate) : undefined,
  };
}
