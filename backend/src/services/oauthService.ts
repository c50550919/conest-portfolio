import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { OAuthProfile } from '../types/oauth';
import { UserModel } from '../models/User';
import { ParentModel } from '../models/Parent';
import { AuthService } from './authService';
import { db } from '../config/database';

/**
 * OAuth Service
 *
 * Handles OAuth 2.0 authentication for Google Sign In and Apple Sign In
 *
 * Features:
 * - Token verification (Google & Apple)
 * - New user signup via OAuth
 * - Returning user signin via OAuth
 * - Account linking (OAuth to existing email/password accounts)
 * - Security: Prevents account takeover, validates email verification
 *
 * Constitution Compliance:
 * - Principle III (Security): Robust token validation, email verification
 * - Principle I (Child Safety): No child PII collected during OAuth
 */

export class OAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    // Initialize Google OAuth2 client
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is required');
    }

    this.googleClient = new OAuth2Client(googleClientId);
  }

  /**
   * T025: Verify Google ID token
   *
   * @param idToken - Google ID token from client
   * @returns OAuthProfile with user information
   * @throws Error if token is invalid, expired, or email not verified
   */
  async verifyGoogleToken(idToken: string): Promise<OAuthProfile> {
    try {
      // Verify token with Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid Google token: no payload');
      }

      // Validate required fields
      if (!payload.sub) {
        throw new Error('Invalid Google token: missing sub (user ID)');
      }

      if (!payload.email) {
        throw new Error('Invalid Google token: missing email');
      }

      if (!payload.email_verified) {
        throw new Error('Email not verified by Google');
      }

      // Extract user information
      const profile: OAuthProfile = {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email.toLowerCase(), // Normalize email
        emailVerified: payload.email_verified,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        photo: payload.picture || '',
      };

      return profile;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw with context
        throw new Error(`Google token verification failed: ${error.message}`);
      }
      throw new Error('Google token verification failed: unknown error');
    }
  }

  /**
   * T026: Verify Apple identity token
   *
   * @param identityToken - Apple identity token from client
   * @param nonce - Nonce used in authorization request (replay attack prevention)
   * @returns OAuthProfile with user information
   * @throws Error if token is invalid, expired, or nonce mismatches
   */
  async verifyAppleToken(
    identityToken: string,
    nonce: string,
  ): Promise<OAuthProfile> {
    try {
      // Verify token with Apple
      const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID || 'com.conest.app',
        nonce: nonce, // Replay attack prevention
      });

      // Validate nonce (critical security check)
      if (appleIdTokenClaims.nonce !== nonce) {
        throw new Error('Nonce mismatch: potential replay attack');
      }

      // Validate required fields
      if (!appleIdTokenClaims.sub) {
        throw new Error('Invalid Apple token: missing sub (user ID)');
      }

      // Apple may not return email on subsequent signins
      if (!appleIdTokenClaims.email) {
        throw new Error('Invalid Apple token: missing email');
      }

      // Apple returns email_verified as string "true"/"false"
      const emailVerified = appleIdTokenClaims.email_verified === 'true';

      // Extract user information
      const profile: OAuthProfile = {
        provider: 'apple',
        providerId: appleIdTokenClaims.sub,
        email: appleIdTokenClaims.email.toLowerCase(), // Normalize email
        emailVerified: emailVerified,
        firstName: '', // Apple provides via separate fullName parameter
        lastName: '', // Will be set in handleOAuthSignIn if provided
        photo: '', // Apple doesn't provide profile photos
      };

      return profile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Apple token verification failed: ${error.message}`);
      }
      throw new Error('Apple token verification failed: unknown error');
    }
  }

  /**
   * T027: Handle OAuth signin/signup orchestration
   *
   * Business Logic:
   * 1. New user (email doesn't exist) → Create account
   * 2. Returning user (OAuth provider matches) → Signin
   * 3. Existing verified email/password account → Link OAuth provider
   * 4. Existing unverified email account → Reject (security: prevent account takeover)
   * 5. Existing account with different OAuth provider → Reject (conflict)
   *
   * @param profile - OAuth profile from token verification
   * @param fullName - Optional full name (Apple provides separately)
   * @returns Object with user, tokens, flags (isNew, linked)
   */
  async handleOAuthSignIn(
    profile: OAuthProfile,
    fullName?: { givenName?: string; familyName?: string },
  ): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    isNew: boolean;
    linked: boolean;
  }> {
    // Override profile names if fullName provided (Apple specific)
    if (fullName) {
      profile.firstName = fullName.givenName || '';
      profile.lastName = fullName.familyName || '';
    }

    // Check if user exists by email
    const existingUser = await UserModel.findByEmail(profile.email);

    if (!existingUser) {
      // CASE 1: New user - create account
      return await this.createNewOAuthUser(profile);
    }

    // Check if user already has this OAuth provider
    if (
      (existingUser as any).oauth_provider === profile.provider &&
      (existingUser as any).oauth_provider_id === profile.providerId
    ) {
      // CASE 2: Returning user - signin
      return await this.signinReturningOAuthUser(existingUser);
    }

    // User exists but with different OAuth provider
    if (
      (existingUser as any).oauth_provider &&
      (existingUser as any).oauth_provider !== profile.provider
    ) {
      // CASE 5: OAuth provider conflict
      throw new Error(
        `Account exists with different OAuth provider: ${(existingUser as any).oauth_provider}. Please sign in with ${(existingUser as any).oauth_provider}.`,
      );
    }

    // User exists with email/password only (no OAuth provider yet)
    if (!(existingUser as any).oauth_provider) {
      // Check email verification status (security requirement)
      if (!existingUser.email_verified) {
        // CASE 4: Reject linking to unverified account (prevent account takeover)
        throw new Error(
          'Email verification required before linking OAuth provider. Please verify your email first.',
        );
      }

      // CASE 3: Link OAuth provider to existing verified account
      return await this.linkOAuthToExistingUser(existingUser, profile);
    }

    // Should never reach here, but handle edge case
    throw new Error('Unexpected OAuth signin state');
  }

  /**
   * Create new user account via OAuth signup
   */
  private async createNewOAuthUser(profile: OAuthProfile): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    isNew: boolean;
    linked: boolean;
  }> {
    return await db.transaction(async (trx) => {
      // Create user record
      const userData = {
        email: profile.email,
        password_hash: null, // OAuth users don't have passwords
        email_verified: profile.emailVerified,
        oauth_provider: profile.provider,
        oauth_provider_id: profile.providerId,
        oauth_profile_picture: profile.photo || null,
        account_status: 'active' as const,
      };

      const user = await UserModel.create(userData as any);

      // Create parent profile
      const parentData = {
        user_id: user.id,
        first_name: profile.firstName,
        last_name: profile.lastName,
        children_count: 0,
        children_age_groups: [],
      };

      await ParentModel.create(parentData as any);

      // Update last_login
      await UserModel.updateLastLogin(user.id);

      // Generate JWT tokens
      const tokenPair = await AuthService.generateTokenPair(user.id, profile.email);

      return {
        user: user,
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: 900, // 15 minutes in seconds
        },
        isNew: true,
        linked: false,
      };
    });
  }

  /**
   * Signin returning OAuth user
   */
  private async signinReturningOAuthUser(user: any): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    isNew: boolean;
    linked: boolean;
  }> {
    // Check account status
    if (user.account_status === 'suspended') {
      throw new Error('Account is suspended');
    }

    if (user.account_status === 'deactivated') {
      throw new Error('Account is deactivated');
    }

    // Update last_login
    await UserModel.updateLastLogin(user.id);

    // Generate new JWT tokens
    const tokenPair = await AuthService.generateTokenPair(user.id, user.email);

    return {
      user: user,
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
      isNew: false,
      linked: false,
    };
  }

  /**
   * Link OAuth provider to existing verified email/password account
   */
  private async linkOAuthToExistingUser(
    existingUser: any,
    profile: OAuthProfile,
  ): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    isNew: boolean;
    linked: boolean;
  }> {
    // Update user record with OAuth fields
    const updatedUser = await UserModel.update(existingUser.id, {
      ...(profile.provider ? { oauth_provider: profile.provider } : {}),
      ...(profile.providerId ? { oauth_provider_id: profile.providerId } : {}),
      oauth_profile_picture: profile.photo || null,
    } as any);

    // Update last_login
    await UserModel.updateLastLogin(existingUser.id);

    // Generate new JWT tokens
    const tokenPair = await AuthService.generateTokenPair(existingUser.id, existingUser.email);

    return {
      user: (updatedUser),
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
      isNew: false,
      linked: true, // OAuth provider was linked
    };
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
