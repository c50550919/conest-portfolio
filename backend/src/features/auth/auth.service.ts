/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Authentication Service - T040
 *
 * Constitution Principle I: Child Safety First
 * - REJECTS any child PII (childrenNames, childrenPhotos, childrenAges, childrenSchools)
 * - Only accepts parent information during registration
 *
 * Constitution Principle III: Security
 * - Bcrypt cost factor: 12
 * - JWT access token: 15min expiry
 * - JWT refresh token: 7 day expiry with rotation
 * - Redis-backed refresh token storage
 */

import { UserModel, User } from '../../models/User';
import { ParentModel } from '../../models/Parent';
import { VerificationModel } from '../../models/Verification';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from '../../utils/jwt';
import { hashPassword, comparePassword } from '../../utils/password';
import redis, { REDIS_TTL } from '../../config/redis';
import { getEmailService } from '../../services/emailService';

// CRITICAL: Prohibited child PII fields - Constitution Principle I
const PROHIBITED_CHILD_FIELDS = [
  'childrenNames',
  'childrenPhotos',
  'childrenAges',
  'childrenSchools',
  'childName',
  'childPhoto',
  'childAge',
  'childSchool',
  'child_name',
  'child_photo',
  'child_age',
  'child_school',
] as const;

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phone?: string; // API uses 'phone', accept both
  // Allow additional fields but will validate against child PII
  [key: string]: unknown;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: Record<string, unknown>;
  tokens: TokenPair;
}

export const AuthService = {
  /**
   * Register a new user
   * CRITICAL: Validates that no child PII is provided
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // CRITICAL: Child PII validation - Constitution Principle I
    this.validateNoChildPII(data);

    // Validate required fields
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      throw new Error('Email, password, firstName, and lastName are required');
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Accept both 'phone' and 'phoneNumber' for API compatibility
    const phoneToCheck = data.phoneNumber || data.phone;
    if (phoneToCheck) {
      const existingPhone = await UserModel.findByPhone(phoneToCheck);
      if (existingPhone) {
        throw new Error('User with this phone number already exists');
      }
    }

    // Hash password using utility (T039)
    const password_hash = await hashPassword(data.password);

    // Create user
    const user = await UserModel.create({
      email: data.email,
      password_hash,
      phone: phoneToCheck,
    });

    // CMP-07: Store ToS/Privacy consent timestamps
    if (data.tosAccepted || data.privacyAccepted) {
      const now = new Date();
      await UserModel.update(user.id, {
        ...(data.tosAccepted ? { tos_accepted_at: now } : {}),
        ...(data.privacyAccepted ? { privacy_accepted_at: now } : {}),
      } as any);
    }

    // Create verification record
    await VerificationModel.create({ user_id: user.id });

    // Generate tokens with refresh token rotation (T038)
    const tokens = await this.generateTokenPair(user.id, data.email);

    // Remove password hash from response (security best practice)
    const { password_hash: _, ...userWithoutPassword } = user;

    // Fire-and-forget welcome email (never throws)
    getEmailService().sendWelcomeEmail(user.email, data.firstName || 'there');

    return { user: userWithoutPassword, tokens };
  },

  /**
   * Authenticate user login
   * Returns user data with profile completion status from parents table
   */
  async login(data: LoginData): Promise<AuthResponse> {
    // Find user
    const user = await UserModel.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password using utility (T039)
    const isValidPassword = await comparePassword(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    // Note: database column is 'status', not 'account_status'
    const accountStatus = (user as any).status || (user as any).account_status;
    if (accountStatus !== 'active') {
      throw new Error(`Account is ${accountStatus}`);
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Fetch parent profile for additional user data
    const parent = await ParentModel.findByUserId(user.id);

    // Generate tokens with refresh token rotation (T038)
    const tokens = await this.generateTokenPair(user.id, user.email);

    // Remove password hash from response (security best practice)
    const { password_hash: _, ...userWithoutPassword } = user;

    // Include profile data needed by mobile app for navigation
    const userResponse = {
      ...userWithoutPassword,
      firstName: parent?.first_name || '',
      lastName: parent?.last_name || '',
      profileComplete: parent?.profile_completed ?? false,
    };

    return { user: userResponse, tokens };
  },

  /**
   * Refresh access token using refresh token
   * Implements refresh token rotation for security
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token using JWT utility (T038)
      const payload = verifyRefreshToken(refreshToken);

      // Verify refresh token exists in Redis
      const storedToken = await redis.get(`refresh_token:${payload.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Verify user still exists and is active
      const user = await UserModel.findById(payload.userId);
      if (!user || user.account_status !== 'active') {
        throw new Error('User not found or inactive');
      }

      // Generate new token pair (refresh token rotation)
      const newTokens = await this.generateTokenPair(user.id, user.email);

      return newTokens;
    } catch (_error) {
      throw new Error('Invalid or expired refresh token');
    }
  },

  /**
   * Find user by phone number
   */
  async findUserByPhone(phone: string): Promise<User | null> {
    const user = await UserModel.findByPhone(phone);
    return user ?? null;
  },

  /**
   * Verify phone verification code
   * Delegates to VerificationService for unified Telnyx integration
   */
  async verifyPhoneCode(userId: string, code: string): Promise<boolean> {
    // Import here to avoid circular dependency
    const { VerificationService } = await import('../verification/verification.service');
    return await VerificationService.verifyPhoneCode(userId, code);
  },

  /**
   * Verify phone number with code
   * @deprecated Use verifyPhoneCode instead (delegates to VerificationService)
   */
  async verifyPhone(userId: string, code: string): Promise<boolean> {
    return await this.verifyPhoneCode(userId, code);
  },

  /**
   * Send phone verification code
   * Delegates to VerificationService for unified Telnyx integration
   *
   * @param userId - User ID
   * @param _phoneNumber - Phone number (ignored - fetched from user record)
   * @returns Verification metadata from Telnyx
   */
  async sendPhoneVerification(userId: string, _phoneNumber?: string): Promise<{ verificationId?: string; expiresIn?: number }> {
    // Import here to avoid circular dependency
    const { VerificationService } = await import('../verification/verification.service');
    return await VerificationService.sendPhoneVerification(userId);
  },

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    await redis.del(`refresh_token:${userId}`);
  },

  /**
   * Generate access and refresh token pair
   * Stores refresh token in Redis with 7-day expiration
   */
  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const payload: JWTPayload = { userId, email };

    // Generate tokens using JWT utility (T038)
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token in Redis with 7-day expiration
    await redis.setex(`refresh_token:${userId}`, REDIS_TTL.VERIFICATION, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: '15m',
    };
  },

  /**
   * CRITICAL: Validate that no child PII is provided
   * Constitution Principle I: Child Safety First
   */
  validateNoChildPII(data: Record<string, unknown>): void {
    const providedFields = Object.keys(data);
    const foundProhibitedFields = providedFields.filter(field =>
      PROHIBITED_CHILD_FIELDS.some(prohibited =>
        field.toLowerCase().includes(prohibited.toLowerCase()),
      ),
    );

    if (foundProhibitedFields.length > 0) {
      throw new Error(
        `Child PII is prohibited: ${foundProhibitedFields.join(', ')}. ` +
        'This platform stores NO child data for safety reasons.',
      );
    }
  },
};
