/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * OAuth Type Definitions
 *
 * Generated from: openapi.yaml
 * Feature: OAuth Social Login (Google & Apple Sign In)
 * Branch: 002-oauth-social-login
 * Date: 2025-10-13
 *
 * Constitution Compliance:
 * - Principle I: Only parent data, no child PII
 * - Principle III: Type-safe OAuth implementation with validation
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Google OAuth Authentication Request
 *
 * Mobile app sends Google ID token obtained from Google Sign In SDK
 */
export interface GoogleAuthRequest {
  /** Google ID token (JWT) from Google Sign In SDK */
  idToken: string;

  /** Optional CSRF state parameter for audit logging */
  state?: string;
}

/**
 * Apple Sign In Authentication Request
 *
 * Mobile app sends Apple identity token obtained from Sign in with Apple
 */
export interface AppleAuthRequest {
  /** Apple identity token (JWT) from Sign in with Apple */
  identityToken: string;

  /** Apple's stable user identifier */
  user: string;

  /**
   * User's name (only provided on first authorization)
   * Note: Apple only provides this once - store it immediately
   */
  fullName?: {
    /** First name */
    givenName?: string;

    /** Last name */
    familyName?: string;
  };

  /** Optional nonce for replay attack prevention (recommended) */
  nonce?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Successful Authentication Response
 *
 * Returned for both new user signup and existing user signin
 */
export interface AuthSuccessResponse {
  /** Always true for successful authentication */
  success: true;

  /** Authenticated user data */
  user: UserResponse;

  /** JWT tokens for API authentication */
  tokens: TokenResponse;

  /**
   * True if new user was created, false if existing user signed in
   * Use this to show appropriate welcome UI
   */
  isNew: boolean;

  /**
   * True if OAuth provider was linked to existing email/password account
   * Only present when account linking occurred
   */
  linked?: boolean;
}

/**
 * User Data Response
 *
 * Contains user account information (no sensitive data)
 */
export interface UserResponse {
  /** User's unique identifier (UUID) */
  id: string;

  /** User's email address (may be Apple relay email) */
  email: string;

  /** Email verification status (always true for OAuth users) */
  email_verified: boolean;

  /** Phone number (if provided during onboarding) */
  phone?: string | null;

  /** Phone verification status */
  phone_verified: boolean;

  /** OAuth provider used for authentication */
  oauth_provider?: 'google' | 'apple';

  /** Provider's unique user ID (Google sub, Apple sub) */
  oauth_provider_id?: string;

  /**
   * Profile picture URL from OAuth provider
   * Note: Null for Apple users (Apple doesn't provide photos)
   */
  oauth_profile_picture?: string | null;

  /** Account status */
  account_status: 'active' | 'suspended' | 'deactivated';

  /** Last login timestamp (ISO 8601) */
  last_login?: string | null;

  /** Account creation timestamp (ISO 8601) */
  created_at: string;
}

/**
 * JWT Token Response
 *
 * Contains access token, refresh token, and expiration info
 */
export interface TokenResponse {
  /** JWT access token for API authentication */
  accessToken: string;

  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string;

  /** Access token expiration time in seconds (typically 3600 = 1 hour) */
  expiresIn: number;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Generic Error Response
 *
 * Returned for validation errors, unauthorized errors, and server errors
 */
export interface ErrorResponse {
  /** Machine-readable error code */
  error:
    | 'validation_error'
    | 'unauthorized'
    | 'email_verification_required'
    | 'internal_server_error';

  /** Human-readable error message for display */
  message: string;

  /** Field name for validation errors (e.g., "idToken") */
  field?: string | null;

  /** Suggested action for user to resolve error */
  suggestedAction?: 'verify_email' | 'signin_with_provider' | null;
}

/**
 * Account Conflict Response
 *
 * Returned when email already exists with different OAuth provider
 */
export interface AccountConflictResponse {
  /** Always 'account_exists' for conflicts */
  error: 'account_exists';

  /** Human-readable conflict explanation */
  message: string;

  /** Existing authentication provider for this email */
  provider: 'google' | 'apple' | 'email';

  /** Suggested action to resolve conflict */
  suggestedAction: 'signin_with_provider' | 'verify_email';
}

/**
 * Rate Limit Response
 *
 * Returned when too many OAuth requests are made in short time
 */
export interface RateLimitResponse {
  /** Always 'rate_limit_exceeded' */
  error: 'rate_limit_exceeded';

  /** Human-readable rate limit message */
  message: string;

  /** Seconds until rate limit resets */
  retryAfter: number;
}

/**
 * Union type of all possible error responses
 */
export type OAuthErrorResponse =
  | ErrorResponse
  | AccountConflictResponse
  | RateLimitResponse;

// ============================================================================
// Internal Types (Backend Only)
// ============================================================================

/**
 * OAuth Profile Data (Transient)
 *
 * Extracted from OAuth provider tokens during authentication
 * NOT PERSISTED - used only for creating/updating User and Parent records
 */
export interface OAuthProfile {
  /** OAuth provider (google or apple) */
  provider: 'google' | 'apple';

  /** Provider's unique user ID (Google sub, Apple sub) */
  providerId: string;

  /** User's email address */
  email: string;

  /** Email verification status from OAuth provider */
  emailVerified: boolean;

  /** First name (may be empty for returning Apple users) */
  firstName: string;

  /** Last name (may be empty for returning Apple users) */
  lastName: string;

  /** Profile picture URL (empty for Apple users) */
  photo: string;
}

/**
 * Internal Authentication Result
 *
 * Used between services in backend (not exposed to API)
 */
export interface AuthResult {
  /** Whether authentication succeeded */
  success: boolean;

  /** User record (if successful) */
  user?: UserResponse;

  /** JWT tokens (if successful) */
  tokens?: TokenResponse;

  /** Whether new user was created */
  isNew?: boolean;

  /** Whether OAuth provider was linked */
  linked?: boolean;

  /** Error information (if failed) */
  error?: string;
}

// ============================================================================
// OAuth Provider Verification Types
// ============================================================================

/**
 * Google ID Token Payload
 *
 * Extracted from verified Google ID token JWT
 * Reference: https://developers.google.com/identity/sign-in/web/backend-auth
 */
export interface GoogleTokenPayload {
  /** Google user ID (unique identifier) */
  sub: string;

  /** User's email address */
  email: string;

  /** Whether Google verified the email */
  email_verified: boolean;

  /** User's full name */
  name?: string;

  /** User's given name (first name) */
  given_name?: string;

  /** User's family name (last name) */
  family_name?: string;

  /** User's profile picture URL */
  picture?: string;

  /** Locale (e.g., "en") */
  locale?: string;

  /** Token issuer (e.g., "https://accounts.google.com") */
  iss: string;

  /** Audience (our client ID) */
  aud: string;

  /** Token issue time (Unix timestamp) */
  iat: number;

  /** Token expiration time (Unix timestamp) */
  exp: number;
}

/**
 * Apple ID Token Payload
 *
 * Extracted from verified Apple identity token JWT
 * Reference: https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user
 */
export interface AppleTokenPayload {
  /** Apple user ID (unique identifier) */
  sub: string;

  /** User's email (may be relay address) */
  email?: string;

  /** Whether Apple verified the email */
  email_verified?: 'true' | 'false' | boolean;

  /** Whether the user appears to be a real person */
  is_private_email?: 'true' | 'false' | boolean;

  /** Nonce value (if provided in request) */
  nonce?: string;

  /** Token issuer (e.g., "https://appleid.apple.com") */
  iss: string;

  /** Audience (our bundle ID or service ID) */
  aud: string;

  /** Token issue time (Unix timestamp) */
  iat: number;

  /** Token expiration time (Unix timestamp) */
  exp: number;

  /** Authentication time (Unix timestamp) */
  auth_time?: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * OAuth Request Validation Errors
 */
export const OAuthValidationErrors = {
  MISSING_ID_TOKEN: 'ID token is required',
  INVALID_ID_TOKEN_FORMAT: 'Invalid ID token format',
  MISSING_IDENTITY_TOKEN: 'Identity token is required',
  INVALID_IDENTITY_TOKEN_FORMAT: 'Invalid identity token format',
  MISSING_USER_ID: 'Apple user ID is required',
  INVALID_TOKEN_LENGTH: 'Token length is invalid',
} as const;

/**
 * OAuth Response Error Codes
 */
export const OAuthErrorCodes = {
  VALIDATION_ERROR: 'validation_error',
  UNAUTHORIZED: 'unauthorized',
  EMAIL_VERIFICATION_REQUIRED: 'email_verification_required',
  ACCOUNT_EXISTS: 'account_exists',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INTERNAL_SERVER_ERROR: 'internal_server_error',
} as const;

/**
 * OAuth Suggested Actions
 */
export const OAuthSuggestedActions = {
  VERIFY_EMAIL: 'verify_email',
  SIGNIN_WITH_PROVIDER: 'signin_with_provider',
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for AuthSuccessResponse
 */
export function isAuthSuccess(
  response: AuthSuccessResponse | OAuthErrorResponse,
): response is AuthSuccessResponse {
  return (response as AuthSuccessResponse).success === true;
}

/**
 * Type guard for ErrorResponse
 */
export function isErrorResponse(
  response: AuthSuccessResponse | OAuthErrorResponse,
): response is ErrorResponse {
  return (
    'error' in response &&
    typeof (response as ErrorResponse).error === 'string'
  );
}

/**
 * Type guard for AccountConflictResponse
 */
export function isAccountConflict(
  response: OAuthErrorResponse,
): response is AccountConflictResponse {
  return (response as AccountConflictResponse).error === 'account_exists';
}

/**
 * Type guard for RateLimitResponse
 */
export function isRateLimitError(
  response: OAuthErrorResponse,
): response is RateLimitResponse {
  return (response as RateLimitResponse).error === 'rate_limit_exceeded';
}

/**
 * Type guard for Google auth request
 */
export function isGoogleAuthRequest(
  request: GoogleAuthRequest | AppleAuthRequest,
): request is GoogleAuthRequest {
  return 'idToken' in request;
}

/**
 * Type guard for Apple auth request
 */
export function isAppleAuthRequest(
  request: GoogleAuthRequest | AppleAuthRequest,
): request is AppleAuthRequest {
  return 'identityToken' in request && 'user' in request;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * OAuth Provider Type
 */
export type OAuthProvider = 'google' | 'apple';

/**
 * Authentication Method Type
 */
export type AuthMethod = 'email' | 'google' | 'apple';

/**
 * Account Status Type
 */
export type AccountStatus = 'active' | 'suspended' | 'deactivated';

/**
 * Extract OAuth provider from user response
 */
export type ExtractProvider<T extends UserResponse> = T['oauth_provider'];

/**
 * Omit sensitive fields from user response (for logging)
 */
export type SafeUserResponse = Omit<
  UserResponse,
  'oauth_provider_id' | 'phone'
>;

// ============================================================================
// Constants
// ============================================================================

/**
 * OAuth token expiration times
 */
export const TOKEN_EXPIRATION = {
  /** Access token expiration (1 hour) */
  ACCESS_TOKEN: 3600,

  /** Refresh token expiration (30 days) */
  REFRESH_TOKEN: 30 * 24 * 60 * 60,

  /** State parameter expiration (5 minutes) */
  STATE: 5 * 60,

  /** Nonce expiration (10 minutes) */
  NONCE: 10 * 60,
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMITS = {
  /** OAuth requests per minute per IP */
  OAUTH_PER_MINUTE: 10,

  /** Retry after seconds when rate limited */
  RETRY_AFTER: 60,
} as const;

/**
 * Validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  /** Minimum ID token length */
  MIN_TOKEN_LENGTH: 100,

  /** Maximum ID token length */
  MAX_TOKEN_LENGTH: 2000,

  /** Minimum state parameter length */
  MIN_STATE_LENGTH: 16,

  /** Maximum state parameter length */
  MAX_STATE_LENGTH: 64,

  /** Minimum Apple user ID length */
  MIN_USER_ID_LENGTH: 10,

  /** Maximum Apple user ID length */
  MAX_USER_ID_LENGTH: 100,
} as const;
