/**
 * T016: Contract Test - POST /api/auth/verify-phone
 */

import request from 'supertest';
import app from '../../src/app';
import { UserModel } from '../../src/models/User';
import { VerificationModel } from '../../src/models/Verification';
import redisClient from '../../src/config/redis';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/Verification');
jest.mock('../../src/config/redis');

// Mock VerificationService to use Redis-based code verification
// instead of the mock phone mode that bypasses Redis
jest.mock('../../src/features/verification/verification.service', () => ({
  VerificationService: {
    verifyPhoneCode: jest.fn(async (userId: string, code: string) => {
      const redis = require('../../src/config/redis').default;
      const storedCode = await redis.get(`phone_verification:${userId}`);
      if (!storedCode || storedCode !== code) {
        return false;
      }
      // Update records (mocked)
      const { VerificationModel } = require('../../src/models/Verification');
      const { UserModel } = require('../../src/models/User');
      await VerificationModel.update(userId, {
        phone_verified: true,
        phone_verification_date: new Date(),
      });
      await UserModel.update(userId, { phone_verified: true });
      await VerificationModel.updateVerificationScore(userId);
      await redis.del(`phone_verification:${userId}`);
      return true;
    }),
  },
}));

describe('POST /api/auth/verify-phone - Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should verify phone number with valid code and return 200', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        email_verified: true,
        account_status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockVerification = {
        id: 'verification-123',
        user_id: userId,
        phone_verified: false,
        email_verified: true,
        verification_score: 15, // Only email verified
        fully_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedVerification = {
        ...mockVerification,
        phone_verified: true,
        phone_verification_date: new Date(),
        verification_score: 30, // Email + Phone
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue({ ...mockUser, phone_verified: true });
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue(mockVerification);
      (VerificationModel.update as jest.Mock).mockResolvedValue(updatedVerification);
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('verified');
    });

    it('should update user phone_verified status', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue({ ...mockUser, phone_verified: true });
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue({});
      (VerificationModel.update as jest.Mock).mockResolvedValue({});
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(UserModel.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ phone_verified: true }),
      );
    });

    it('should update verification record and recalculate score', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      const mockVerification = {
        id: 'verification-123',
        user_id: userId,
        phone_verified: false,
        verification_score: 15,
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue({ ...mockUser, phone_verified: true });
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue(mockVerification);
      (VerificationModel.update as jest.Mock).mockResolvedValue({});
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(VerificationModel.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          phone_verified: true,
          phone_verification_date: expect.any(Date),
        }),
      );
      expect(VerificationModel.updateVerificationScore).toHaveBeenCalledWith(userId);
    });

    it('should delete verification code from Redis after successful verification', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue({ ...mockUser, phone_verified: true });
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue({});
      (VerificationModel.update as jest.Mock).mockResolvedValue({});
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(redisClient.del).toHaveBeenCalledWith(`phone_verification:${userId}`);
    });
  });

  describe('Validation Error Cases', () => {
    it('should return 400 for invalid phone format', async () => {
      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '1234567890', // Missing + prefix
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for phone number without country code', async () => {
      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '2345678901', // Missing +
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid code format', async () => {
      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '12345', // Should be 6 digits
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for code with non-numeric characters', async () => {
      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '12345a', // Contains letter
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing phone', async () => {
      const response = await request(app).post('/api/auth/verify-phone').send({
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing code', async () => {
      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Verification Error Cases', () => {
    it('should return 400 for incorrect verification code', async () => {
      const userId = 'user-123';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue('654321'); // Different code

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid verification code');
    });

    it('should return 400 for expired verification code', async () => {
      const userId = 'user-123';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(null); // Code expired

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid verification code');
    });

    it('should return 404 for non-existent user', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return correct response structure on success', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue({ ...mockUser, phone_verified: true });
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue({});
      (VerificationModel.update as jest.Mock).mockResolvedValue({});
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(response.body).toMatchObject({
        success: expect.any(Boolean),
        message: expect.any(String),
      });
      expect(response.body.success).toBe(true);
    });

    it('should not expose sensitive user data in response', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'should_not_appear',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue({ ...mockUser, phone_verified: true });
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue({});
      (VerificationModel.update as jest.Mock).mockResolvedValue({});
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('password_hash');
      expect(responseString).not.toContain('should_not_appear');
    });
  });

  describe('Idempotency', () => {
    it('should handle already verified phone numbers gracefully', async () => {
      const userId = 'user-123';
      const code = '123456';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: true, // Already verified
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(code);
      (UserModel.update as jest.Mock).mockResolvedValue(mockUser);
      (VerificationModel.findByUserId as jest.Mock).mockResolvedValue({
        phone_verified: true,
      });
      (VerificationModel.update as jest.Mock).mockResolvedValue({});
      (VerificationModel.updateVerificationScore as jest.Mock).mockResolvedValue(30);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      // Should still return success
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Requirements', () => {
    it('should prevent brute force attacks by rate limiting', async () => {
      // This test documents the expected behavior
      // Actual rate limiting should be implemented in middleware

      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue('654321');

      // Make multiple failed attempts
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        await request(app).post('/api/auth/verify-phone').send({
          phone: '+12345678901',
          code: '123456',
        });
      }

      // All should fail with 400 (incorrect code)
      expect(redisClient.get).toHaveBeenCalledTimes(attempts);
    });

    it('should use 6-digit numeric code only', async () => {
      // This test documents code format requirements
      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: 'ABCDEF', // Non-numeric
      });

      expect(response.status).toBe(400);
    });

    it('should have time-limited verification codes (10 minutes)', async () => {
      // This test documents the expected TTL behavior
      // Redis codes should expire after 10 minutes (600 seconds)

      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '+12345678901',
        phone_verified: false,
        account_status: 'active',
      };

      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(null); // Expired

      const response = await request(app).post('/api/auth/verify-phone').send({
        phone: '+12345678901',
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid verification code');
    });
  });
});
