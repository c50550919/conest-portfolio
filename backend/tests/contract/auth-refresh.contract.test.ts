/**
 * T015: Contract Test - POST /api/auth/refresh
 */

import request from 'supertest';
import app from '../../src/app';
import { UserModel } from '../../src/models/User';
import redisClient from '../../src/config/redis';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/config/redis');

describe('POST /api/auth/refresh - Contract Tests', () => {
  // App uses JWT_SECRET for both access and refresh tokens (see src/utils/jwt.ts)
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should refresh access token with valid refresh token and return 200', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        account_status: 'active',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(refreshToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');
    });

    it('should implement refresh token rotation (return new refresh token)', async () => {
      const userId = 'user-123';
      const oldRefreshToken = jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        account_status: 'active',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(oldRefreshToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: oldRefreshToken,
      });

      // New refresh token should be different from old one
      expect(response.body.data.refreshToken).not.toBe(oldRefreshToken);

      // Should store new refresh token in Redis
      expect(redisClient.setex).toHaveBeenCalled();
    });
  });

  describe('Validation Error Cases', () => {
    it('should return 400 for missing refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: '',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Error Cases', () => {
    it('should return 401 for invalid refresh token format', async () => {
      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid.token.format',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired refresh token');
    });

    it('should return 401 for expired refresh token', async () => {
      const expiredToken = jwt.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '-1s',
      });

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: expiredToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired refresh token');
    });

    it('should return 401 for token signed with wrong secret', async () => {
      const invalidToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        'wrong-secret',
        { expiresIn: '7d' },
      );

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: invalidToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for token not found in Redis', async () => {
      const validToken = jwt.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: validToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired refresh token');
    });

    it('should return 401 for token mismatch in Redis', async () => {
      // Create two clearly different tokens by using different timestamps
      const clientToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: '7d' },
      );

      const differentToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', iat: Math.floor(Date.now() / 1000) - 100 },
        JWT_SECRET,
        { expiresIn: '7d' },
      );

      (redisClient.get as jest.Mock).mockResolvedValue(differentToken);

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: clientToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for non-existent user', async () => {
      const validToken = jwt.sign(
        { userId: 'user-nonexistent', email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '7d' },
      );

      (redisClient.get as jest.Mock).mockResolvedValue(validToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: validToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired refresh token');
    });

    it('should return 401 for inactive user', async () => {
      const validToken = jwt.sign({ userId: 'user-123', email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const inactiveUser = {
        id: 'user-123',
        email: 'test@example.com',
        account_status: 'suspended',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
      };

      (redisClient.get as jest.Mock).mockResolvedValue(validToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(inactiveUser);

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: validToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return correct response structure on success', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        account_status: 'active',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(refreshToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(response.body).toMatchObject({
        success: expect.any(Boolean),
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(String),
        },
      });
    });

    it('should not include user data in response (only tokens)', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'should_not_appear',
        account_status: 'active',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(refreshToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(response.body.data).not.toHaveProperty('user');
      expect(response.body.data).not.toHaveProperty('password_hash');
    });
  });

  describe('Security Requirements', () => {
    it('should invalidate old refresh token after rotation', async () => {
      const userId = 'user-123';
      const oldRefreshToken = jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        account_status: 'active',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(oldRefreshToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      await request(app).post('/api/auth/refresh').send({
        refreshToken: oldRefreshToken,
      });

      // Verify Redis setex was called to store new token
      expect(redisClient.setex).toHaveBeenCalled();
      const setexCall = (redisClient.setex as jest.Mock).mock.calls[0];
      expect(setexCall[0]).toContain(`refresh_token:${userId}`);

      // The new token should be different from old token
      const newTokenFromRedis = setexCall[2];
      expect(newTokenFromRedis).not.toBe(oldRefreshToken);
    });

    it('should set proper TTL for refresh token in Redis', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '7d',
      });

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        account_status: 'active',
        phone_verified: true,
        email_verified: true,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(refreshToken);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.setex as jest.Mock).mockResolvedValue('OK');

      await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      // Verify Redis setex was called with proper TTL (7 days = 604800 seconds)
      expect(redisClient.setex).toHaveBeenCalled();
      const setexCall = (redisClient.setex as jest.Mock).mock.calls[0];
      expect(setexCall[1]).toBe(604800); // 7 days in seconds
    });
  });
});
