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

import { UserModel } from '../models/User';
import { VerificationModel } from '../models/Verification';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import redis, { REDIS_TTL } from '../config/redis';

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
  // Allow additional fields but will validate against child PII
  [key: string]: any;
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
  user: any;
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

    if (data.phoneNumber) {
      const existingPhone = await UserModel.findByPhone(data.phoneNumber);
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
      phone: data.phoneNumber,
    });

    // Create verification record
    await VerificationModel.create({ user_id: user.id });

    // Generate tokens with refresh token rotation (T038)
    const tokens = await this.generateTokenPair(user.id, data.email);

    // Remove password hash from response (security best practice)
    const { password_hash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  },

  /**
   * Authenticate user login
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
    if (user.account_status !== 'active') {
      throw new Error(`Account is ${user.account_status}`);
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens with refresh token rotation (T038)
    const tokens = await this.generateTokenPair(user.id, user.email);

    // Remove password hash from response (security best practice)
    const { password_hash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
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
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  },

  /**
   * Verify phone number with code
   * TODO: Integrate with Twilio for actual SMS verification
   */
  async verifyPhone(userId: string, code: string): Promise<boolean> {
    // Verify user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify code from Redis
    const storedCode = await redis.get(`phone_verification:${userId}`);
    if (!storedCode || storedCode !== code) {
      return false;
    }

    // Update user phone verification status
    await UserModel.update(userId, { phone_verified: true });

    // Update verification record
    const verification = await VerificationModel.findByUserId(userId);
    if (verification) {
      await VerificationModel.update(userId, {
        phone_verified: true,
        phone_verification_date: new Date(),
      });
      // Recalculate verification score
      await VerificationModel.updateVerificationScore(userId);
    }

    // Remove verification code from Redis
    await redis.del(`phone_verification:${userId}`);

    return true;
  },

  /**
   * Send phone verification code
   * TODO: Integrate with Twilio
   */
  async sendPhoneVerification(userId: string, phoneNumber: string): Promise<void> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 10 minute expiration
    await redis.setex(`phone_verification:${userId}`, 600, code);

    // TODO: Send SMS via Twilio
    console.log(`Phone verification code for ${phoneNumber}: ${code}`);
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
  validateNoChildPII(data: Record<string, any>): void {
    const providedFields = Object.keys(data);
    const foundProhibitedFields = providedFields.filter(field =>
      PROHIBITED_CHILD_FIELDS.some(prohibited =>
        field.toLowerCase().includes(prohibited.toLowerCase())
      )
    );

    if (foundProhibitedFields.length > 0) {
      throw new Error(
        `Child PII is prohibited: ${foundProhibitedFields.join(', ')}. ` +
        'This platform stores NO child data for safety reasons.'
      );
    }
  },
};
