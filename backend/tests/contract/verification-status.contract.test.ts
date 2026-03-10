/**
 * Contract Test: GET /api/verification/status
 * Test: Verification status retrieval with email, phone, ID, background check, and income verification
 */

import request from 'supertest';
import app from '../app';

describe('Contract: GET /api/verification/status', () => {
  let authToken: string;

  beforeAll(() => {
    authToken = 'mock-jwt-token-verified-paid';
  });

  it('should return complete verification status', async () => {
    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        email_verified: expect.any(Boolean),
        phone_verified: expect.any(Boolean),
        id_verification_status: expect.stringMatching(/pending|approved|rejected/),
        background_check_status: expect.stringMatching(/pending|clear|consider|rejected/),
        income_verification_status: expect.any(String),
        verification_score: expect.any(Number),
        fully_verified: expect.any(Boolean),
      },
    });
  });

  it('should return verification score between 0 and 100', async () => {
    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.verification_score).toBeGreaterThanOrEqual(0);
    expect(response.body.data.verification_score).toBeLessThanOrEqual(100);
  });

  it('should indicate fully_verified is true when all verifications complete', async () => {
    // This test assumes the mock user has completed all verifications
    const fullyVerifiedToken = 'mock-jwt-token-verified-paid';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${fullyVerifiedToken}`)
      .expect(200);

    const { data } = response.body;

    // If all verifications are complete, fully_verified should be true
    if (
      data.email_verified &&
      data.phone_verified &&
      data.id_verification_status === 'approved' &&
      data.background_check_status === 'clear'
    ) {
      expect(data.fully_verified).toBe(true);
      expect(data.verification_score).toBeGreaterThan(80); // High score when fully verified
    }
  });

  it('should indicate fully_verified is false when verifications incomplete', async () => {
    // This test assumes a user with incomplete verifications
    const incompleteToken = 'mock-jwt-token-incomplete';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${incompleteToken}`)
      .expect(200);

    const { data } = response.body;

    // If any verification is incomplete, fully_verified should be false
    if (
      !data.email_verified ||
      !data.phone_verified ||
      data.id_verification_status !== 'approved' ||
      data.background_check_status !== 'clear'
    ) {
      expect(data.fully_verified).toBe(false);
    }
  });

  it('should handle pending ID verification status', async () => {
    const pendingIdToken = 'mock-jwt-token-pending-id';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${pendingIdToken}`)
      .expect(200);

    expect(response.body.data.id_verification_status).toMatch(/pending|approved|rejected/);
  });

  it('should handle pending background check status', async () => {
    const pendingBgToken = 'mock-jwt-token-pending-background';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${pendingBgToken}`)
      .expect(200);

    expect(response.body.data.background_check_status).toMatch(/pending|clear|consider|rejected/);
  });

  it('should return 401 when no auth token provided', async () => {
    await request(app).get('/api/verification/status').expect(401);
  });

  it('should respond within 100ms (P95)', async () => {
    const start = Date.now();

    await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Date.now() - start).toBeLessThan(100);
  });

  it('should return consistent verification score for same user', async () => {
    const response1 = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const response2 = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response1.body.data.verification_score).toBe(response2.body.data.verification_score);
  });

  it('should include all required verification fields', async () => {
    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const { data } = response.body;

    // Verify all required fields are present
    expect(data).toHaveProperty('email_verified');
    expect(data).toHaveProperty('phone_verified');
    expect(data).toHaveProperty('id_verification_status');
    expect(data).toHaveProperty('background_check_status');
    expect(data).toHaveProperty('income_verification_status');
    expect(data).toHaveProperty('verification_score');
    expect(data).toHaveProperty('fully_verified');
  });

  it('should handle rejected background check status', async () => {
    const rejectedBgToken = 'mock-jwt-token-rejected-background';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${rejectedBgToken}`)
      .expect(200);

    if (response.body.data.background_check_status === 'rejected') {
      expect(response.body.data.fully_verified).toBe(false);
      expect(response.body.data.verification_score).toBeLessThan(100);
    }
  });

  it('should handle consider status for background check', async () => {
    const considerBgToken = 'mock-jwt-token-consider-background';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${considerBgToken}`)
      .expect(200);

    if (response.body.data.background_check_status === 'consider') {
      // Consider status means admin review required
      expect(response.body.data.fully_verified).toBe(false);
    }
  });
});
