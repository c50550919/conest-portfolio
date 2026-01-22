/**
 * Phone Verification Integration Tests
 *
 * Purpose: Test the complete phone verification flow with REAL database
 * In test mode, uses mock verification code "123456" (Telnyx is not called)
 *
 * Test Flow:
 * 1. Create test user in real DB
 * 2. POST /api/verification/phone/send - Send code
 * 3. POST /api/verification/phone/verify - Verify code
 * 4. Assert: users.phone_verified = true
 * 5. Assert: verifications.phone_verified = true
 *
 * Prerequisites:
 *   docker-compose -f docker-compose.test.yml up -d
 *
 * Run with:
 *   npm run test:integration -- verification-phone
 */

import request from 'supertest';
import app from '../../src/app';
import {
  db,
  createIntegrationTestUser,
} from '../setup-integration';

describe('Phone Verification Integration', () => {
  describe('Complete Phone Verification Flow', () => {
    it('should verify phone number and update database', async () => {
      // 1. Setup: Create test user with phone not verified
      const testUser = await createIntegrationTestUser({
        email: `phone-test-${Date.now()}@test.com`,
        phone: '+15551234567',
        phoneVerified: false, // Start as not verified
        emailVerified: true,
      });

      // Verify initial state - phone not verified
      const userBefore = await db('users').where({ id: testUser.id }).first();
      expect(userBefore.phone_verified).toBe(false);

      const verificationBefore = await db('verifications')
        .where({ user_id: testUser.id })
        .first();
      expect(verificationBefore.phone_verified).toBe(false);

      // 2. Send phone verification code
      const sendResponse = await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(sendResponse.body.success).toBe(true);
      expect(sendResponse.body.message).toContain('Verification code sent');

      // 3. Verify phone with mock code "123456" (test mode)
      const verifyResponse = await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '123456' })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.message).toContain('Phone verified');

      // 4. Assert: users.phone_verified = true
      const userAfter = await db('users').where({ id: testUser.id }).first();
      expect(userAfter.phone_verified).toBe(true);

      // 5. Assert: verifications.phone_verified = true
      const verificationAfter = await db('verifications')
        .where({ user_id: testUser.id })
        .first();
      expect(verificationAfter.phone_verified).toBe(true);
      expect(verificationAfter.phone_verification_date).not.toBeNull();

      // Verification score should have been recalculated
      expect(verificationAfter.verification_score).toBeGreaterThan(verificationBefore.verification_score);
    });

    it('should reject invalid verification code', async () => {
      // Setup: Create test user
      const testUser = await createIntegrationTestUser({
        email: `phone-invalid-${Date.now()}@test.com`,
        phone: '+15559876543',
        phoneVerified: false,
        emailVerified: true,
      });

      // Send code first
      await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      // Try to verify with wrong code
      const response = await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '000000' }) // Wrong code
        .expect(400);

      expect(response.body.error).toContain('Invalid');

      // User should still not be verified
      const user = await db('users').where({ id: testUser.id }).first();
      expect(user.phone_verified).toBe(false);
    });

    it('should reject verification without code in request', async () => {
      const testUser = await createIntegrationTestUser({
        email: `phone-nocode-${Date.now()}@test.com`,
        phone: '+15551111111',
        phoneVerified: false,
      });

      const response = await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({}) // No code
        .expect(400);

      expect(response.body.error).toContain('code');
    });

    it('should require authentication for phone verification', async () => {
      // Try without token
      const sendResponse = await request(app)
        .post('/api/verification/phone/send')
        .expect(401);

      expect(sendResponse.body.error).toBeDefined();

      const verifyResponse = await request(app)
        .post('/api/verification/phone/verify')
        .send({ code: '123456' })
        .expect(401);

      expect(verifyResponse.body.error).toBeDefined();
    });
  });

  describe('Voice Call Fallback', () => {
    it('should send verification via voice call', async () => {
      const testUser = await createIntegrationTestUser({
        email: `phone-voice-${Date.now()}@test.com`,
        phone: '+15552222222',
        phoneVerified: false,
        emailVerified: true,
      });

      // Request voice call
      const response = await request(app)
        .post('/api/verification/phone/voice')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('voice call');

      // Verify with mock code should still work
      const verifyResponse = await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '123456' })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      // Verify database updated
      const user = await db('users').where({ id: testUser.id }).first();
      expect(user.phone_verified).toBe(true);
    });
  });

  describe('Verification Status', () => {
    it('should return correct verification status after phone verification', async () => {
      const testUser = await createIntegrationTestUser({
        email: `phone-status-${Date.now()}@test.com`,
        phone: '+15553333333',
        phoneVerified: false,
        emailVerified: true,
      });

      // Check status before verification
      const statusBefore = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(statusBefore.body.success).toBe(true);
      expect(statusBefore.body.data.phone_verified).toBe(false);

      // Complete verification
      await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '123456' })
        .expect(200);

      // Check status after verification
      const statusAfter = await request(app)
        .get('/api/verification/status')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(statusAfter.body.success).toBe(true);
      expect(statusAfter.body.data.phone_verified).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle user without phone number', async () => {
      // Create user without phone number
      const [user] = await db('users')
        .insert({
          email: `no-phone-${Date.now()}@test.com`,
          password_hash: '$2b$10$test',
          email_verified: true,
          phone_verified: false,
          account_status: 'active',
          // No phone field
        })
        .returning('*');

      // Create verification record
      await db('verifications').insert({
        user_id: user.id,
        email_verified: true,
        phone_verified: false,
        id_verification_status: 'pending',
        background_check_status: 'pending',
        fully_verified: false,
        verification_score: 50,
      });

      // Generate token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'test-secret-key-for-testing-only',
        { expiresIn: '1h' }
      );

      // Try to send code - should fail gracefully
      const response = await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${token}`)
        .expect(500); // Internal error because phone is missing

      expect(response.body.error).toBeDefined();
    });

    it('should handle already verified phone number', async () => {
      // Create user with already verified phone
      const testUser = await createIntegrationTestUser({
        email: `phone-already-${Date.now()}@test.com`,
        phone: '+15554444444',
        phoneVerified: true, // Already verified
        emailVerified: true,
      });

      // Send code should still work (for re-verification scenarios)
      const sendResponse = await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(sendResponse.body.success).toBe(true);
    });
  });

  describe('Idempotency', () => {
    it('should handle multiple verification attempts correctly', async () => {
      const testUser = await createIntegrationTestUser({
        email: `phone-multi-${Date.now()}@test.com`,
        phone: '+15555555555',
        phoneVerified: false,
        emailVerified: true,
      });

      // First verification
      await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '123456' })
        .expect(200);

      // Second verification attempt (already verified)
      await request(app)
        .post('/api/verification/phone/send')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      await request(app)
        .post('/api/verification/phone/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ code: '123456' })
        .expect(200);

      // User should still be verified (idempotent)
      const user = await db('users').where({ id: testUser.id }).first();
      expect(user.phone_verified).toBe(true);
    });
  });
});
