/**
 * Connection Request Entity - Canonical Type Definitions
 *
 * Database Table: connection_requests
 * Constitution Principle I: NO child PII - only parent communication
 * Constitution Principle III: Messages encrypted at rest (AES-256-GCM)
 * Constitution Principle IV: Rate limiting - 5/day, 15/week
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type ConnectionRequestStatusDB =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface ConnectionRequestDB {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_encrypted: string;
  message_iv: string;
  status: ConnectionRequestStatusDB;
  sent_at: Date;
  expires_at: Date;
  response_message_encrypted: string | null;
  response_message_iv: string | null;
  responded_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConnectionRequestDB {
  sender_id: string;
  recipient_id: string;
  message: string; // Plaintext, will be encrypted before storage
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

export type ConnectionRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn'
  | 'cancelled';

/**
 * Connection request API response
 */
export interface ConnectionRequest {
  id: string;
  senderId: string;
  recipientId: string;
  targetUserId: string; // Alias for recipientId (mobile compatibility)
  message: string; // Decrypted message
  status: ConnectionRequestStatus;
  sentAt: string; // ISO date string
  expiresAt: string; // ISO date string
  responseMessage?: string; // Decrypted response
  respondedAt?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

/**
 * Connection request with embedded profile information
 */
export interface ConnectionRequestWithProfile extends ConnectionRequest {
  sender: ConnectionRequestProfile;
  recipient: ConnectionRequestProfile;
  targetProfile?: ConnectionRequestProfile; // Alias for recipient (mobile compatibility)
}

export interface ConnectionRequestProfile {
  id: string;
  userId: string;
  firstName: string;
  age: number;
  city: string;
  state: string;
  verificationScore: number;
  profilePhoto?: string;
  verificationStatus?: {
    idVerified: boolean;
    backgroundCheckComplete: boolean;
    phoneVerified: boolean;
  };
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateConnectionRequestInput {
  recipientId: string;
  targetUserId?: string; // Alias for recipientId
  message: string;
}

export interface RespondToConnectionRequestInput {
  requestId: string;
  accepted: boolean;
  responseMessage?: string;
}

export interface CancelConnectionRequestInput {
  requestId: string;
}

// =============================================================================
// Response Types
// =============================================================================

export interface ConnectionRequestResponse {
  request: ConnectionRequest;
  rateLimitStatus?: RateLimitStatus;
}

export interface ConnectionRequestListResponse {
  requests: ConnectionRequestWithProfile[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ConnectionAcceptedResponse {
  request: ConnectionRequest;
  matchCreated: boolean;
  match?: {
    id: string;
    matchedUserId: string;
    compatibilityScore: number;
    conversationId: string;
    createdAt: string;
  };
}

export interface RateLimitStatus {
  dailyRemaining: number;
  weeklyRemaining: number;
  dailyLimit: number;
  weeklyLimit: number;
  resetAt?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const CONNECTION_REQUEST_CONSTANTS = {
  // Rate limits
  RATE_LIMIT_DAILY: 5,
  RATE_LIMIT_WEEKLY: 15,

  // Message constraints
  MIN_MESSAGE_LENGTH: 1,
  MAX_MESSAGE_LENGTH: 500,

  // Expiration
  EXPIRATION_DAYS: 14,
  ARCHIVE_AFTER_DAYS: 90,

  // Status display labels
  STATUS_LABELS: {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    withdrawn: 'Withdrawn',
    cancelled: 'Cancelled',
  } as const,
} as const;
