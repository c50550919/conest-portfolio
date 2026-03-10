/**
 * T017: Integration Test - Registration Flow
 *
 * End-to-end registration workflow test:
 * 1. Register new user account
 * 2. Login with credentials
 * 3. Verify JWT token is valid
 * 4. Access protected endpoint with token
 *
 * Constitution Principle I: Child Safety
 * - Validates that child PII is rejected
 * Constitution Principle III: Security
 * - Password hashing, JWT tokens, protected endpoints
 */

import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/config/database';
import redisClient from '../../src/config/redis';
import { UserModel } from '../../src/models/User';
import { VerificationModel } from '../../src/models/Verification';
import { verifyToken } from '../../src/utils/jwt';
import { comparePassword } from '../../src/utils/password';

describe('Integration Test: Registration Flow', () => {
  // Test database cleanup
  beforeEach(async () => {
    // Clean up test database tables
    await db('verifications').del();
    await db('users').del();

    // Clear Redis
    await redisClient.flushdb();
  });

  afterAll(async () => {
    // Clean up and close connections
    await db('verifications').del();
    await db('users').del();
    await redisClient.flushdb();
    await db.destroy();
    await redisClient.quit();
  });

  describe('Complete Registration Flow', () => {
    it('should register � login � verify token � access protected endpoint', async () => {
      const userData = {
        email: 'integration-test@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Integration',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      };

      // STEP 1: Register new user
      const registerResponse = await request(app).post('/api/auth/register').send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data).toHaveProperty('tokens');

      const { user, tokens } = registerResponse.body.data;

      expect(user.email).toBe(userData.email);
      expect(user).not.toHaveProperty('password_hash');
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');

      // Verify user exists in database
      const dbUser = await UserModel.findByEmail(userData.email);
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(userData.email);
      expect(dbUser?.phone_number).toBe(userData.phone);

      // Verify password is hashed correctly
      const isValidPassword = await comparePassword(userData.password, dbUser!.password_hash);
      expect(isValidPassword).toBe(true);

      // Verify verification record was created
      const verification = await VerificationModel.findByUserId(dbUser!.id);
      expect(verification).toBeDefined();

      // STEP 2: Login with same credentials
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: userData.email,
        password: userData.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('tokens');

      const loginTokens = loginResponse.body.data.tokens;

      // STEP 3: Verify access token is valid
      const tokenResult = verifyToken(loginTokens.accessToken);
      expect(tokenResult.valid).toBe(true);
      expect(tokenResult.payload).toHaveProperty('userId');
      expect(tokenResult.payload).toHaveProperty('email', userData.email);

      // STEP 4: Access protected endpoint with token
      const protectedResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${loginTokens.accessToken}`);

      // Should either return 200 (if profile exists) or 404 (if profile not created yet)
      // Both are valid - the important thing is NOT 401 Unauthorized
      expect([200, 404]).toContain(protectedResponse.status);

      if (protectedResponse.status === 401) {
        throw new Error('Protected endpoint returned 401 - token authentication failed');
      }
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate-test@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Duplicate',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      // First registration
      const firstResponse = await request(app).post('/api/auth/register').send(userData);

      expect(firstResponse.status).toBe(201);

      // Second registration with same email
      const secondResponse = await request(app).post('/api/auth/register').send(userData);

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('email');
    });

    it('should prevent duplicate phone registration', async () => {
      const firstUserData = {
        email: 'user1@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'User',
        lastName: 'One',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const secondUserData = {
        ...firstUserData,
        email: 'user2@example.com', // Different email
        // Same phone number
      };

      // First registration
      const firstResponse = await request(app).post('/api/auth/register').send(firstUserData);

      expect(firstResponse.status).toBe(201);

      // Second registration with same phone
      const secondResponse = await request(app).post('/api/auth/register').send(secondUserData);

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('phone');
    });
  });

  describe('CRITICAL: Child PII Validation', () => {
    it('should reject registration with prohibited child PII fields', async () => {
      const invalidData = {
        email: 'child-pii-test@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        // PROHIBITED FIELDS
        childrenNames: ['Alice', 'Bob'],
        childrenAges: [3, 7],
      };

      const response = await request(app).post('/api/auth/register').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Prohibited child PII');

      // Verify user was NOT created in database
      const dbUser = await UserModel.findByEmail(invalidData.email);
      expect(dbUser).toBeUndefined();
    });
  });

  describe('Password Security', () => {
    it('should hash password with bcrypt cost factor 12', async () => {
      const userData = {
        email: 'password-test@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Password',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app).post('/api/auth/register').send(userData);

      expect(response.status).toBe(201);

      // Retrieve user from database
      const dbUser = await UserModel.findByEmail(userData.email);

      // Verify password is hashed
      expect(dbUser!.password_hash).not.toBe(userData.password);

      // Verify bcrypt format (starts with $2a$12$ or $2b$12$)
      expect(dbUser!.password_hash).toMatch(/^\$2[ab]\$12\$/);

      // Verify password can be compared correctly
      const isValid = await comparePassword(userData.password, dbUser!.password_hash);
      expect(isValid).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'short', // Too short
        'nouppercase1!', // No uppercase
        'NOLOWERCASE1!', // No lowercase
        'NoNumbers!', // No numbers
        'NoSpecial123', // No special characters
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak-${weakPassword}@example.com`,
            password: weakPassword,
            phone: '+14155552671',
            firstName: 'Weak',
            lastName: 'Password',
            dateOfBirth: '1990-01-01',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            childrenCount: 1,
            childrenAgeGroups: ['toddler'],
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('JWT Token Management', () => {
    it('should store refresh token in Redis with proper TTL', async () => {
      const userData = {
        email: 'token-test@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Token',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app).post('/api/auth/register').send(userData);

      expect(response.status).toBe(201);

      const { user, tokens } = response.body.data;

      // Verify refresh token is stored in Redis
      const storedToken = await redisClient.get(`refresh_token:${user.id}`);
      expect(storedToken).toBe(tokens.refreshToken);

      // Verify TTL is set (should be 7 days = 604800 seconds)
      const ttl = await redisClient.ttl(`refresh_token:${user.id}`);
      expect(ttl).toBeGreaterThan(604700); // Allow small margin for execution time
      expect(ttl).toBeLessThanOrEqual(604800);
    });

    it('should generate different access and refresh tokens', async () => {
      const userData = {
        email: 'different-tokens@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Different',
        lastName: 'Tokens',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      const response = await request(app).post('/api/auth/register').send(userData);

      expect(response.status).toBe(201);

      const { tokens } = response.body.data;

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });
  });

  describe('Failed Login After Registration', () => {
    it('should reject login with incorrect password', async () => {
      const userData = {
        email: 'failed-login@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Failed',
        lastName: 'Login',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      // Register user
      const registerResponse = await request(app).post('/api/auth/register').send(userData);

      expect(registerResponse.status).toBe(201);

      // Attempt login with wrong password
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: userData.email,
        password: 'WrongPassword123!',
      });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.error).toContain('Invalid credentials');
    });

    it('should not reveal if email exists in error message', async () => {
      const userData = {
        email: 'security-test@example.com',
        password: 'SecurePass123!',
        phone: '+14155552671',
        firstName: 'Security',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
      };

      // Register user
      await request(app).post('/api/auth/register').send(userData);

      // Login with non-existent email
      const response1 = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      });

      // Login with existing email but wrong password
      const response2 = await request(app).post('/api/auth/login').send({
        email: userData.email,
        password: 'WrongPassword123!',
      });

      // Both should return same error message
      expect(response1.status).toBe(401);
      expect(response2.status).toBe(401);
      expect(response1.body.error).toBe(response2.body.error);
    });
  });
});
