/**
 * Mobile OAuth Types
 *
 * TypeScript interfaces for OAuth authentication flows
 * Matches backend OAuth API contracts
 */

/**
 * Google OAuth Sign In Request
 */
export interface GoogleAuthRequest {
  /** Google ID token from Google Sign In */
  idToken: string;
}

/**
 * Apple OAuth Sign In Request
 */
export interface AppleAuthRequest {
  /** Apple identity token from Sign in with Apple */
  identityToken: string;

  /** Nonce for replay attack prevention */
  nonce: string;

  /** User's full name (only provided on first sign in) */
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
}

/**
 * Sanitized User object returned from OAuth endpoints
 */
export interface OAuthUser {
  id: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  accountStatus: 'active' | 'suspended' | 'deactivated';
  lastLogin: string | null;
  oauthProvider: 'google' | 'apple' | null;
  oauthProviderId: string | null;
  oauthProfilePicture: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * JWT Token Pair
 */
export interface TokenResponse {
  /** JWT access token for API authentication */
  accessToken: string;

  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string;

  /** Access token expiration time in seconds (typically 900 = 15 minutes) */
  expiresIn: number;
}

/**
 * Successful OAuth Authentication Response
 */
export interface AuthSuccessResponse {
  success: true;
  user: OAuthUser;
  tokens: TokenResponse;

  /** True if this is a newly created account */
  isNew: boolean;

  /** True if OAuth provider was linked to existing email/password account */
  linked: boolean;
}

/**
 * OAuth Error Response
 */
export interface OAuthErrorResponse {
  success: false;

  /** Error type (unauthorized, forbidden, conflict, internal_error) */
  error: 'unauthorized' | 'forbidden' | 'conflict' | 'validation_error' | 'internal_error';

  /** Human-readable error message */
  message: string;
}

/**
 * Account Conflict Response (409 Conflict)
 * Returned when user tries to sign in with different OAuth provider
 */
export interface AccountConflictResponse {
  success: false;
  error: 'conflict';
  message: string;

  /** The OAuth provider already linked to this email */
  existingProvider: 'google' | 'apple';
}

/**
 * Rate Limit Response (429 Too Many Requests)
 */
export interface RateLimitResponse {
  success: false;
  error: 'rate_limit_exceeded';
  message: string;

  /** Seconds until rate limit resets */
  retryAfter: number;
}

/**
 * Union type for all possible OAuth responses
 */
export type OAuthResponse =
  | AuthSuccessResponse
  | OAuthErrorResponse
  | AccountConflictResponse
  | RateLimitResponse;

/**
 * OAuth Error class for better error handling
 */
export class OAuthError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
