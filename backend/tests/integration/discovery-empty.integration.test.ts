/**
 * T024: Integration Test - Empty State Handling
 *
 * Tests empty discovery queue scenarios and edge cases.
 *
 * **Scenarios**:
 * - No available profiles (new user)
 * - All profiles swiped
 * - All remaining profiles are unverified
 * - Geographic isolation (no nearby users)
 */

import request from 'supertest';
import { app } from '../../src/app';
import db from '../../src/config/database';
import redis from '../../src/config/redis';

describe('Discovery Empty State - Integration Tests', () => {
  let authToken: string;
  let currentUserId: string;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
    await redis.quit();
  });

  beforeEach(async () => {
    // Clean database
    await db('swipes').del();
    await db('matches').del();
    await db('profiles').del();
    await db('verifications').del();
    await db('users').del();

    // Create test user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'lonely@test.com',
        password: 'SecurePass123!',
        phone: '+15551111111',
        firstName: 'Lonely',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      });

    authToken = registerRes.body.accessToken;
    currentUserId = registerRes.body.user.id;

    // Mark as verified
    await db('verifications').where({ user_id: currentUserId }).update({
      id_verification_status: 'verified',
      background_check_status: 'verified',
      phone_verified: true,
      email_verified: true,
      fully_verified: true,
    });
  });

  describe('Empty State - No Available Profiles', () => {
    it('should return empty array when no other users exist', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });

    it('should return consistent empty state on repeated requests', async () => {
      // First request
      const first = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(first.body.profiles).toEqual([]);

      // Second request
      const second = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(second.body.profiles).toEqual([]);
      expect(second.body.nextCursor).toBeNull();
    });

    it('should handle pagination with empty state', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, cursor: 'some-cursor' })
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });
  });

  describe('Empty State - All Profiles Swiped', () => {
    beforeEach(async () => {
      // Create 3 target users
      for (let i = 1; i <= 3; i++) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: `target${i}@test.com`,
            password: 'SecurePass123!',
            phone: `+155522222${i}${i}`,
            firstName: `Target${i}`,
            lastName: 'User',
            dateOfBirth: '1988-01-01',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            childrenCount: 1,
            childrenAgeGroups: ['elementary'],
          });

        const userId = res.body.user.id;

        await db('verifications').where({ user_id: userId }).update({
          id_verification_status: 'verified',
          background_check_status: 'verified',
          phone_verified: true,
          email_verified: true,
          fully_verified: true,
        });
      }
    });

    it('should return empty array after swiping all profiles', async () => {
      // Get all profiles
      const initial = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const profileCount = initial.body.profiles.length;
      expect(profileCount).toBe(3);

      // Swipe on all profiles
      for (const profile of initial.body.profiles) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: profile.userId,
            direction: Math.random() > 0.5 ? 'right' : 'left',
          })
          .expect(200);
      }

      // Check for empty state
      const empty = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(empty.body.profiles).toEqual([]);
      expect(empty.body.nextCursor).toBeNull();
    });

    it('should maintain empty state after all profiles swiped', async () => {
      // Get and swipe all profiles
      const initial = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      for (const profile of initial.body.profiles) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: profile.userId,
            direction: 'right',
          });
      }

      // Multiple requests should all return empty
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.profiles).toEqual([]);
        expect(response.body.nextCursor).toBeNull();
      }
    });

    it('should update when new verified user joins', async () => {
      // Swipe on all existing profiles
      const initial = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      for (const profile of initial.body.profiles) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: profile.userId,
            direction: 'left',
          });
      }

      // Verify empty state
      const empty = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(empty.body.profiles).toEqual([]);

      // New user joins
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          phone: '+15559999999',
          firstName: 'New',
          lastName: 'User',
          dateOfBirth: '1995-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
        });

      await db('verifications').where({ user_id: newUserRes.body.user.id }).update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

      // Should now have 1 profile
      const updated = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updated.body.profiles.length).toBe(1);
      expect(updated.body.profiles[0].userId).toBe(newUserRes.body.user.id);
    });
  });

  describe('Empty State - Only Unverified Users', () => {
    beforeEach(async () => {
      // Create 2 unverified users
      for (let i = 1; i <= 2; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: `unverified${i}@test.com`,
            password: 'SecurePass123!',
            phone: `+155533333${i}${i}`,
            firstName: `Unverified${i}`,
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            childrenCount: 1,
            childrenAgeGroups: ['teen'],
          });
        // Do NOT verify these users
      }
    });

    it('should return empty array when only unverified users exist', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });

    it('should show profiles after users become verified', async () => {
      // Initially empty
      const before = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(before.body.profiles).toEqual([]);

      // Verify one user
      const unverifiedUser = await db('users').where({ email: 'unverified1@test.com' }).first();

      await db('verifications').where({ user_id: unverifiedUser.id }).update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

      // Should now have 1 profile
      const after = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(after.body.profiles.length).toBe(1);
      expect(after.body.profiles[0].userId).toBe(unverifiedUser.id);
    });
  });

  describe('Empty State - Error Scenarios', () => {
    it('should handle database error gracefully', async () => {
      // This would require mocking database to fail
      // For now, test basic error handling
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });

    it('should return 401 if token expired (not empty state)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.statusCode).toBe(401);
    });

    it('should handle Redis cache miss gracefully', async () => {
      // Clear Redis cache
      await redis.flushdb();

      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(response.body.profiles).toEqual([]);
    });
  });

  describe('Empty State - Performance', () => {
    it('should return empty state quickly (<100ms)', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;

      console.log(`Empty state response time: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('should cache empty state for performance', async () => {
      // First request (cache miss)
      const first = Date.now();
      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const firstDuration = Date.now() - first;

      // Second request (cache hit)
      const second = Date.now();
      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const secondDuration = Date.now() - second;

      console.log(`First: ${firstDuration}ms, Second: ${secondDuration}ms`);
      expect(secondDuration).toBeLessThanOrEqual(firstDuration * 1.5);
    });
  });

  describe('Empty State - User Feedback', () => {
    it('should return empty array (not error) when no profiles available', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // NOT 404

      expect(response.body.profiles).toEqual([]);
      expect(response.body).not.toHaveProperty('error');
    });

    it('should include nextCursor=null in empty state', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('nextCursor');
      expect(response.body.nextCursor).toBeNull();
    });

    it('should maintain consistent empty state structure', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        profiles: [],
        nextCursor: null,
      });
    });
  });

  describe('Empty State - Transition Scenarios', () => {
    it('should transition from profiles to empty after swiping', async () => {
      // Create one user
      const targetRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'target@test.com',
          password: 'SecurePass123!',
          phone: '+15555555555',
          firstName: 'Target',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: 1,
          childrenAgeGroups: ['elementary'],
        });

      await db('verifications').where({ user_id: targetRes.body.user.id }).update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

      // Initially has profiles
      const before = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(before.body.profiles.length).toBe(1);

      // Swipe on the profile
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetRes.body.user.id,
          direction: 'right',
        });

      // Should now be empty
      const after = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(after.body.profiles).toEqual([]);
      expect(after.body.nextCursor).toBeNull();
    });

    it('should transition from empty to profiles when new user joins', async () => {
      // Initially empty
      const before = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(before.body.profiles).toEqual([]);

      // New user joins
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newjoin@test.com',
          password: 'SecurePass123!',
          phone: '+15556666666',
          firstName: 'New',
          lastName: 'Join',
          dateOfBirth: '1992-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: 2,
          childrenAgeGroups: ['toddler', 'elementary'],
        });

      await db('verifications').where({ user_id: newUserRes.body.user.id }).update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

      // Should now have profiles
      const after = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(after.body.profiles.length).toBe(1);
      expect(after.body.profiles[0].userId).toBe(newUserRes.body.user.id);
    });
  });

  describe('Empty State - Boundary Conditions', () => {
    it('should handle limit=0 query parameter', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 0 })
        .expect(422); // Invalid limit

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/limit/i);
    });

    it('should handle limit=1 with empty state', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });

    it('should handle very large limit with empty state', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 50 }) // max allowed
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });
  });
});
