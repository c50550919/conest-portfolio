import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { VerificationModel } from '../models/Verification';
import redisClient from '../config/redis';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface RegisterData {
  email: string;
  password: string;
  phone?: string;
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

export const AuthService = {
  async register(data: RegisterData): Promise<{ user: any; tokens: TokenPair }> {
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    if (data.phone) {
      const existingPhone = await UserModel.findByPhone(data.phone);
      if (existingPhone) {
        throw new Error('User with this phone number already exists');
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await UserModel.create({
      email: data.email,
      password_hash,
      phone: data.phone,
    });

    // Create verification record
    await VerificationModel.create({ user_id: user.id });

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id);

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  },

  async login(data: LoginData): Promise<{ user: any; tokens: TokenPair }> {
    // Find user
    const user = await UserModel.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id);

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  },

  async generateTokenPair(userId: string): Promise<TokenPair> {
    const accessToken = jwt.sign(
      { userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    // Store refresh token in Redis with expiration
    const expiresInSeconds = this.parseExpiration(JWT_REFRESH_EXPIRES_IN);
    await redisClient.setex(`refresh_token:${userId}`, expiresInSeconds, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

      // Verify refresh token exists in Redis
      const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new token pair
      return await this.generateTokenPair(decoded.userId);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  },

  async logout(userId: string): Promise<void> {
    // Remove refresh token from Redis
    await redisClient.del(`refresh_token:${userId}`);
  },

  async requestPasswordReset(email: string): Promise<void> {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' } as jwt.SignOptions
    );

    // Store in Redis with 1 hour expiration
    await redisClient.setex(`password_reset:${user.id}`, 3600, resetToken);

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // Verify token in Redis
      const storedToken = await redisClient.get(`password_reset:${decoded.userId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password
      await UserModel.update(decoded.userId, { password_hash });

      // Remove reset token
      await redisClient.del(`password_reset:${decoded.userId}`);

      // Invalidate all refresh tokens
      await redisClient.del(`refresh_token:${decoded.userId}`);
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  },

  // Mock 2FA functions (placeholder for future implementation)
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    // MOCK: In production, use speakeasy or similar library
    const mockSecret = 'MOCK2FASECRET';
    const mockQRCode = 'data:image/png;base64,mock-qr-code';

    await UserModel.update(userId, {
      two_factor_enabled: true,
      two_factor_secret: mockSecret,
    });

    return { secret: mockSecret, qrCode: mockQRCode };
  },

  async verify2FA(userId: string, code: string): Promise<boolean> {
    // MOCK: Always return true for development
    console.log(`2FA verification for user ${userId} with code: ${code}`);
    return true;
  },

  async disable2FA(userId: string): Promise<void> {
    await UserModel.update(userId, {
      two_factor_enabled: false,
      two_factor_secret: undefined,
    });
  },

  // Helper function to parse expiration strings
  parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  },
};
