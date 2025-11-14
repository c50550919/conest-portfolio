/**
 * OAuth Service Unit Tests
 *
 * Feature: 002-oauth-social-login
 * Purpose: Test OAuth token verification and signin logic in isolation
 * Constitution: Principle III (Security - server-side token verification)
 *
 * Test Coverage:
 * T012: OAuthService.verifyGoogleToken() - Google ID token verification
 * T013: OAuthService.verifyAppleToken() - Apple identity token verification
 * T014: OAuthService.handleOAuthSignIn() - OAuth signin orchestration logic
 *
 * Reference: specs/002-oauth-social-login/research.md (Tasks 1, 2, 5)
 * Created: 2025-10-13
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import { OAuthService } from '../services/oauthService';
import type { OAuthProfile, AuthResult } from '../types/oauth';

// Mock google-auth-library
vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: vi.fn(),
    })),
  };
});

// Mock apple-signin-auth
vi.mock('apple-signin-auth', () => {
  return {
    default: {
      verifyIdToken: vi.fn(),
    },
  };
});

// Mock UserModel and ParentModel
vi.mock('../models/User', () => ({
  UserModel: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../models/Parent', () => ({
  ParentModel: {
    create: vi.fn(),
  },
}));

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    generateTokenPair: vi.fn(),
  },
}));

describe('OAuthService Unit Tests', () => {
  let oauthService: typeof OAuthService;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  // ========================================
  // T012: verifyGoogleToken() Tests
  // ========================================
  describe('T012: verifyGoogleToken()', () => {
    it('should successfully verify valid Google ID token', async () => {
      // This test will FAIL until OAuthService is implemented
      const mockToken = 'valid-google-id-token';
      const mockPayload = {
        sub: '104523452345234523452',
        email: 'john@gmail.com',
        email_verified: true,
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/a/...',
      };

      // Mock OAuth2Client.verifyIdToken to return mock payload
      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        getPayload: () => mockPayload,
      });
      (OAuth2Client as any).mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      // Call the service method (will fail - not implemented yet)
      const result: OAuthProfile = await oauthService.verifyGoogleToken(mockToken);

      // Assertions
      expect(result).toMatchObject({
        provider: 'google',
        providerId: '104523452345234523452',
        email: 'john@gmail.com',
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        photo: 'https://lh3.googleusercontent.com/a/...',
      });

      // Verify OAuth2Client was called correctly
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: mockToken,
        audience: expect.any(String), // GOOGLE_CLIENT_ID from env
      });
    });

    it('should throw error for invalid Google token signature', async () => {
      const mockToken = 'invalid-signature-token';

      // Mock OAuth2Client to throw error
      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockRejectedValue(
        new Error('Invalid token signature')
      );
      (OAuth2Client as any).mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      // Should throw error
      await expect(oauthService.verifyGoogleToken(mockToken)).rejects.toThrow(
        'Invalid Google token'
      );
    });

    it('should throw error for expired Google token', async () => {
      const mockToken = 'expired-token';

      // Mock OAuth2Client to throw expiration error
      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockRejectedValue(
        new Error('Token used too late')
      );
      (OAuth2Client as any).mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      // Should throw error
      await expect(oauthService.verifyGoogleToken(mockToken)).rejects.toThrow(
        'Invalid Google token'
      );
    });

    it('should throw error for token with wrong audience', async () => {
      const mockToken = 'wrong-audience-token';

      // Mock OAuth2Client to throw audience mismatch error
      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockRejectedValue(
        new Error('Wrong recipient, payload audience')
      );
      (OAuth2Client as any).mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      // Should throw error
      await expect(oauthService.verifyGoogleToken(mockToken)).rejects.toThrow(
        'Invalid Google token'
      );
    });

    it('should handle missing email in token payload', async () => {
      const mockToken = 'token-without-email';
      const mockPayload = {
        sub: '104523452345234523452',
        // email missing
        email_verified: false,
      };

      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        getPayload: () => mockPayload,
      });
      (OAuth2Client as any).mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      // Should throw error or handle gracefully
      await expect(oauthService.verifyGoogleToken(mockToken)).rejects.toThrow();
    });

    it('should use empty strings for missing name fields', async () => {
      const mockToken = 'token-without-name';
      const mockPayload = {
        sub: '104523452345234523452',
        email: 'noname@gmail.com',
        email_verified: true,
        // given_name and family_name missing
        picture: '',
      };

      const { OAuth2Client } = await import('google-auth-library');
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        getPayload: () => mockPayload,
      });
      (OAuth2Client as any).mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      const result = await oauthService.verifyGoogleToken(mockToken);

      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
    });
  });

  // ========================================
  // T013: verifyAppleToken() Tests
  // ========================================
  describe('T013: verifyAppleToken()', () => {
    it('should successfully verify valid Apple identity token', async () => {
      // This test will FAIL until OAuthService is implemented
      const mockToken = 'valid-apple-identity-token';
      const mockNonce = 'a1b2c3d4e5f6g7h8';

      // Mock apple-signin-auth response
      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockResolvedValue({
        sub: '000123.abc456def789.1234',
        email: 'sarah@privaterelay.appleid.com',
        email_verified: 'true',
        nonce: mockNonce,
      } as any);

      // Call the service method (will fail - not implemented yet)
      const result: OAuthProfile = await oauthService.verifyAppleToken(
        mockToken,
        mockNonce
      );

      // Assertions
      expect(result).toMatchObject({
        provider: 'apple',
        providerId: '000123.abc456def789.1234',
        email: 'sarah@privaterelay.appleid.com',
        emailVerified: true,
        firstName: '', // Apple doesn't provide in token
        lastName: '', // Apple doesn't provide in token
        photo: '', // Apple doesn't provide photos
      });

      // Verify apple-signin-auth was called correctly
      expect(appleSignin.default.verifyIdToken).toHaveBeenCalledWith(mockToken, {
        audience: expect.any(String), // APPLE_CLIENT_ID from env
        nonce: mockNonce,
        ignoreExpiration: false,
      });
    });

    it('should throw error for invalid Apple token signature', async () => {
      const mockToken = 'invalid-apple-token';

      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockRejectedValue(
        new Error('Invalid token signature')
      );

      await expect(
        oauthService.verifyAppleToken(mockToken)
      ).rejects.toThrow('Invalid Apple token');
    });

    it('should throw error for expired Apple token', async () => {
      const mockToken = 'expired-apple-token';

      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockRejectedValue(
        new Error('Token expired')
      );

      await expect(
        oauthService.verifyAppleToken(mockToken)
      ).rejects.toThrow('Invalid Apple token');
    });

    it('should throw error for nonce mismatch', async () => {
      const mockToken = 'token-with-wrong-nonce';
      const expectedNonce = 'expected-nonce';
      const actualNonce = 'different-nonce';

      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockResolvedValue({
        sub: '000123.abc456def789.1234',
        email: 'test@privaterelay.appleid.com',
        email_verified: 'true',
        nonce: actualNonce, // Different from expected
      } as any);

      // Should detect nonce mismatch and throw
      await expect(
        oauthService.verifyAppleToken(mockToken, expectedNonce)
      ).rejects.toThrow('Nonce mismatch');
    });

    it('should work without nonce (optional)', async () => {
      const mockToken = 'token-without-nonce';

      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockResolvedValue({
        sub: '000123.abc456def789.1234',
        email: 'test@privaterelay.appleid.com',
        email_verified: 'true',
      } as any);

      const result = await oauthService.verifyAppleToken(mockToken);

      expect(result.provider).toBe('apple');
      expect(result.providerId).toBe('000123.abc456def789.1234');
    });

    it('should handle Apple relay email addresses', async () => {
      const mockToken = 'token-with-relay-email';

      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockResolvedValue({
        sub: '000456.relay789.5678',
        email: 'xyz123@privaterelay.appleid.com',
        email_verified: 'true',
      } as any);

      const result = await oauthService.verifyAppleToken(mockToken);

      expect(result.email).toMatch(/@privaterelay\.appleid\.com$/);
      expect(result.emailVerified).toBe(true);
    });

    it('should handle missing email (rare but possible)', async () => {
      const mockToken = 'token-without-email';

      const appleSignin = await import('apple-signin-auth');
      vi.mocked(appleSignin.default.verifyIdToken).mockResolvedValue({
        sub: '000789.noemail.9012',
        // email missing
        email_verified: false,
      } as any);

      const result = await oauthService.verifyAppleToken(mockToken);

      expect(result.email).toBe('');
      expect(result.emailVerified).toBe(false);
    });
  });

  // ========================================
  // T014: handleOAuthSignIn() Tests
  // ========================================
  describe('T014: handleOAuthSignIn()', () => {
    const mockGoogleProfile: OAuthProfile = {
      provider: 'google',
      providerId: '104523452345234523452',
      email: 'test@gmail.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      photo: 'https://example.com/photo.jpg',
    };

    describe('New User Signup', () => {
      it('should create new user and parent profile for non-existent email', async () => {
        // Mock UserModel.findByEmail to return null (user doesn't exist)
        const { UserModel } = await import('../models/User');
        vi.mocked(UserModel.findByEmail).mockResolvedValue(undefined);

        // Mock user creation
        const mockNewUser = {
          id: 'new-user-id',
          email: 'test@gmail.com',
          email_verified: true,
          oauth_provider: 'google',
          oauth_provider_id: '104523452345234523452',
          password_hash: null,
        };
        vi.mocked(UserModel.create).mockResolvedValue(mockNewUser as any);

        // Mock parent profile creation
        const { ParentModel } = await import('../models/Parent');
        vi.mocked(ParentModel.create).mockResolvedValue({} as any);

        // Mock token generation
        const { authService } = await import('../services/authService');
        const mockTokens = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
        };
        vi.mocked(authService.generateTokenPair).mockResolvedValue(mockTokens as any);

        // Call handleOAuthSignIn
        const result: AuthResult = await oauthService.handleOAuthSignIn(mockGoogleProfile);

        // Assertions
        expect(result.success).toBe(true);
        expect(result.isNew).toBe(true);
        expect(result.user).toMatchObject({
          email: 'test@gmail.com',
          oauth_provider: 'google',
        });
        expect(result.tokens).toMatchObject(mockTokens);

        // Verify UserModel.create was called with correct data
        expect(UserModel.create).toHaveBeenCalledWith({
          email: 'test@gmail.com',
          email_verified: true,
          oauth_provider: 'google',
          oauth_provider_id: '104523452345234523452',
          oauth_profile_picture: 'https://example.com/photo.jpg',
          password_hash: null,
        });

        // Verify ParentModel.create was called
        expect(ParentModel.create).toHaveBeenCalledWith({
          user_id: 'new-user-id',
          first_name: 'Test',
          last_name: 'User',
          profile_photo: 'https://example.com/photo.jpg',
        });
      });
    });

    describe('Returning OAuth User Signin', () => {
      it('should sign in existing OAuth user with matching provider', async () => {
        const mockExistingUser = {
          id: 'existing-user-id',
          email: 'test@gmail.com',
          email_verified: true,
          oauth_provider: 'google',
          oauth_provider_id: '104523452345234523452',
          password_hash: null,
        };

        const { UserModel } = await import('../models/User');
        vi.mocked(UserModel.findByEmail).mockResolvedValue(mockExistingUser as any);

        // Mock token generation
        const { authService } = await import('../services/authService');
        const mockTokens = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
        };
        vi.mocked(authService.generateTokenPair).mockResolvedValue(mockTokens as any);

        const result: AuthResult = await oauthService.handleOAuthSignIn(mockGoogleProfile);

        expect(result.success).toBe(true);
        expect(result.isNew).toBe(false);
        expect(result.linked).toBeUndefined();
        expect(result.user).toMatchObject({
          id: 'existing-user-id',
          oauth_provider: 'google',
        });
      });
    });

    describe('Account Linking - Verified Email', () => {
      it('should link OAuth provider to existing verified email/password account', async () => {
        const mockExistingUser = {
          id: 'email-user-id',
          email: 'test@gmail.com',
          email_verified: true, // Verified
          password_hash: '$2b$12$mockPasswordHash',
          oauth_provider: null, // No OAuth yet
        };

        const { UserModel } = await import('../models/User');
        vi.mocked(UserModel.findByEmail).mockResolvedValue(mockExistingUser as any);

        // Mock update
        const mockUpdatedUser = {
          ...mockExistingUser,
          oauth_provider: 'google',
          oauth_provider_id: '104523452345234523452',
        };
        vi.mocked(UserModel.update).mockResolvedValue(mockUpdatedUser as any);

        // Mock token generation
        const { authService } = await import('../services/authService');
        vi.mocked(authService.generateTokenPair).mockResolvedValue({
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        } as any);

        const result: AuthResult = await oauthService.handleOAuthSignIn(mockGoogleProfile);

        expect(result.success).toBe(true);
        expect(result.isNew).toBe(false);
        expect(result.linked).toBe(true);
        expect(result.user?.oauth_provider).toBe('google');

        // Verify password_hash preserved
        expect(UserModel.update).toHaveBeenCalledWith(
          'email-user-id',
          expect.objectContaining({
            oauth_provider: 'google',
            oauth_provider_id: '104523452345234523452',
          })
        );
      });
    });

    describe('Account Linking - Unverified Email Rejection', () => {
      it('should reject linking for unverified email', async () => {
        const mockUnverifiedUser = {
          id: 'unverified-user-id',
          email: 'unverified@example.com',
          email_verified: false, // NOT verified
          password_hash: '$2b$12$mockPasswordHash',
          oauth_provider: null,
        };

        const { UserModel } = await import('../models/User');
        vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUnverifiedUser as any);

        // Should throw error
        await expect(
          oauthService.handleOAuthSignIn(mockGoogleProfile)
        ).rejects.toThrow('email verification');
      });

      it('should reject linking when OAuth provider email not verified', async () => {
        const mockUser = {
          id: 'user-id',
          email: 'test@example.com',
          email_verified: true,
          password_hash: '$2b$12$mockPasswordHash',
        };

        const unverifiedOAuthProfile: OAuthProfile = {
          ...mockGoogleProfile,
          emailVerified: false, // OAuth provider didn't verify
        };

        const { UserModel } = await import('../models/User');
        vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

        // Should reject
        await expect(
          oauthService.handleOAuthSignIn(unverifiedOAuthProfile)
        ).rejects.toThrow();
      });
    });

    describe('Provider Conflict', () => {
      it('should reject when user exists with different OAuth provider', async () => {
        const mockAppleUser = {
          id: 'apple-user-id',
          email: 'conflict@example.com',
          email_verified: true,
          oauth_provider: 'apple', // Already using Apple
          oauth_provider_id: '000456.apple.5678',
          password_hash: null,
        };

        const { UserModel } = await import('../models/User');
        vi.mocked(UserModel.findByEmail).mockResolvedValue(mockAppleUser as any);

        // Try to sign in with Google
        await expect(
          oauthService.handleOAuthSignIn(mockGoogleProfile)
        ).rejects.toThrow('different provider');
      });
    });
  });
});
