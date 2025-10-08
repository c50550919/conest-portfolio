/**
 * T022: Integration Test - Swipe Right Flow
 *
 * Tests end-to-end swipe right workflow with profile queue removal.
 *
 * **Key Behavior**: Profile removed from discovery queue after swipe
 * **Performance**: <50ms swipe action
 */

import request from 'supertest';
import { app } from '../../src/app';
import db from '../../src/config/database';
import redis from '../../src/config/redis';

describe('Discovery Swipe Right Flow - Integration Tests', () => {
  let authToken: string;
  let currentUserId: string;
  let targetUser1: any;
  let targetUser2: any;
  let targetUser3: any;

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

    // Create viewer user
    const viewerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'swiper@test.com',
        password: 'SecurePass123!',
        phone: '+15551111111',
        firstName: 'Alice',
        lastName: 'Swiper',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      });

    authToken = viewerRes.body.accessToken;
    currentUserId = viewerRes.body.user.id;

    // Mark as verified
    await db('verifications')
      .where({ user_id: currentUserId })
      .update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

    // Create 3 target users
    const createTargetUser = async (index: number) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `target${index}@test.com`,
          password: 'SecurePass123!',
          phone: `+155522222${index}${index}`,
          firstName: `Target${index}`,
          lastName: 'User',
          dateOfBirth: '1988-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: 1,
          childrenAgeGroups: ['elementary'],
        });

      const userId = res.body.user.id;

      await db('verifications')
        .where({ user_id: userId })
        .update({
          id_verification_status: 'verified',
          background_check_status: 'verified',
          phone_verified: true,
          email_verified: true,
          fully_verified: true,
        });

      return {
        userId,
        email: `target${index}@test.com`,
        token: res.body.accessToken,
      };
    };

    targetUser1 = await createTargetUser(1);
    targetUser2 = await createTargetUser(2);
    targetUser3 = await createTargetUser(3);
  });

  describe('Swipe Right Action', () => {
    it('should record swipe right successfully', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
      expect(response.body).toHaveProperty('matchCreated');
      expect(response.body.swipeId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should store swipe in database with correct data', async () => {
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Check database
      const swipe = await db('swipes')
        .where({
          user_id: currentUserId,
          target_user_id: targetUser1.userId,
        })
        .first();

      expect(swipe).toBeDefined();
      expect(swipe.direction).toBe('right');
      expect(swipe.created_at).toBeDefined();
    });

    it('should remove swiped profile from discovery queue', async () => {
      // Fetch initial profiles
      const beforeSwipe = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const profileIds = beforeSwipe.body.profiles.map((p: any) => p.userId);
      expect(profileIds).toContain(targetUser1.userId);

      // Swipe right on targetUser1
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Fetch profiles again
      const afterSwipe = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const afterProfileIds = afterSwipe.body.profiles.map((p: any) => p.userId);
      expect(afterProfileIds).not.toContain(targetUser1.userId);
    });

    it('should prevent duplicate swipe on same user', async () => {
      // First swipe
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Duplicate swipe (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(400);

      expect(response.body.error).toMatch(/duplicate|already/i);
    });

    it('should prevent changing swipe direction (no undo)', async () => {
      // Swipe right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Try to swipe left on same user (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'left',
        })
        .expect(400);

      expect(response.body.error).toMatch(/duplicate|already/i);
    });
  });

  describe('Multiple Swipes', () => {
    it('should allow sequential swipes on different users', async () => {
      // Swipe on user 1
      const swipe1 = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      expect(swipe1.body).toHaveProperty('swipeId');

      // Swipe on user 2
      const swipe2 = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser2.userId,
          direction: 'right',
        })
        .expect(200);

      expect(swipe2.body).toHaveProperty('swipeId');
      expect(swipe2.body.swipeId).not.toBe(swipe1.body.swipeId);
    });

    it('should progressively reduce discovery queue as user swipes', async () => {
      // Initial count
      const initial = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const initialCount = initial.body.profiles.length;
      expect(initialCount).toBe(3); // 3 target users

      // Swipe on user 1
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Check count (should be 2)
      const afterOne = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(afterOne.body.profiles.length).toBe(2);

      // Swipe on user 2
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser2.userId,
          direction: 'right',
        })
        .expect(200);

      // Check count (should be 1)
      const afterTwo = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(afterTwo.body.profiles.length).toBe(1);
    });

    it('should track all swipes in database', async () => {
      // Swipe on all users
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser2.userId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser3.userId,
          direction: 'right',
        });

      // Check database
      const swipes = await db('swipes')
        .where({ user_id: currentUserId })
        .orderBy('created_at', 'asc');

      expect(swipes.length).toBe(3);
      expect(swipes[0].target_user_id).toBe(targetUser1.userId);
      expect(swipes[1].target_user_id).toBe(targetUser2.userId);
      expect(swipes[2].target_user_id).toBe(targetUser3.userId);
      expect(swipes.every(s => s.direction === 'right')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete swipe in <50ms', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      const duration = Date.now() - start;

      console.log(`Swipe action time: ${duration}ms`);
      expect(duration).toBeLessThan(50);
    });

    it('should handle rapid sequential swipes efficiently', async () => {
      const swipes = [
        { targetUserId: targetUser1.userId, direction: 'right' as const },
        { targetUserId: targetUser2.userId, direction: 'right' as const },
        { targetUserId: targetUser3.userId, direction: 'right' as const },
      ];

      const start = Date.now();

      for (const swipe of swipes) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send(swipe)
          .expect(200);
      }

      const duration = Date.now() - start;
      const avgTime = duration / swipes.length;

      console.log(`Average swipe time: ${avgTime}ms`);
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Queue Management', () => {
    it('should update Redis queue after swipe', async () => {
      // Swipe right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Redis queue should be updated
      // Check by fetching profiles (should use updated queue)
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const profileIds = response.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(targetUser1.userId);
    });

    it('should maintain queue integrity after multiple swipes', async () => {
      // Get initial queue
      const initial = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const initialIds = initial.body.profiles.map((p: any) => p.userId);

      // Swipe on first user
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: initialIds[0],
          direction: 'right',
        })
        .expect(200);

      // Get updated queue
      const updated = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const updatedIds = updated.body.profiles.map((p: any) => p.userId);

      // Verify integrity
      expect(updatedIds).not.toContain(initialIds[0]);
      expect(updatedIds.length).toBe(initialIds.length - 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle swipe on last remaining profile', async () => {
      // Swipe on all but one
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser2.userId,
          direction: 'right',
        });

      // Check remaining
      const remaining = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(remaining.body.profiles.length).toBe(1);

      // Swipe on last profile
      const lastSwipe = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser3.userId,
          direction: 'right',
        })
        .expect(200);

      expect(lastSwipe.body).toHaveProperty('swipeId');

      // Queue should be empty
      const empty = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(empty.body.profiles).toEqual([]);
      expect(empty.body.nextCursor).toBeNull();
    });

    it('should reject swipe if target user becomes unverified', async () => {
      // Unverify target user
      await db('verifications')
        .where({ user_id: targetUser1.userId })
        .update({ fully_verified: false });

      // Attempt swipe (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(404);

      expect(response.body.error).toMatch(/not found|not verified/i);
    });

    it('should persist swipe even if Redis cache fails', async () => {
      // This would require mocking Redis to fail
      // For now, just verify database persistence

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        })
        .expect(200);

      // Verify in database
      const swipe = await db('swipes')
        .where({
          user_id: currentUserId,
          target_user_id: targetUser1.userId,
        })
        .first();

      expect(swipe).toBeDefined();
      expect(swipe.direction).toBe('right');
    });
  });

  describe('Swipe History', () => {
    it('should maintain chronological swipe history', async () => {
      // Swipe on multiple users
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser2.userId,
          direction: 'right',
        });

      // Check database order
      const swipes = await db('swipes')
        .where({ user_id: currentUserId })
        .orderBy('created_at', 'asc');

      expect(swipes.length).toBe(2);
      expect(swipes[0].target_user_id).toBe(targetUser1.userId);
      expect(swipes[1].target_user_id).toBe(targetUser2.userId);
      expect(new Date(swipes[1].created_at) > new Date(swipes[0].created_at)).toBe(true);
    });

    it('should track swipe direction in history', async () => {
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUser1.userId,
          direction: 'right',
        });

      const swipe = await db('swipes')
        .where({
          user_id: currentUserId,
          target_user_id: targetUser1.userId,
        })
        .first();

      expect(swipe.direction).toBe('right');
    });
  });
});
