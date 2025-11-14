/**
 * Contract Test: GET /api/verification/status
 * Test: Payment status, background check status, grace period handling
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
        payment_status: expect.stringMatching(/paid|unpaid|pending/),
        verification_status: expect.stringMatching(/approved|pending|rejected|consider/),
        id_verification: expect.any(Object),
        background_check: expect.any(Object),
        can_send_requests: expect.any(Boolean),
        expires_at: expect.any(String)
      }
    });
  });

  it('should return grace period info when verification under review', async () => {
    const reviewToken = 'mock-jwt-token-under-review';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${reviewToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      verification_status: 'pending',
      grace_period_active: true,
      grace_period_expires_at: expect.any(String),
      can_send_requests: true
    });
  });

  it('should indicate payment required when unpaid', async () => {
    const unpaidToken = 'mock-jwt-token-unpaid';

    const response = await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${unpaidToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      payment_status: 'unpaid',
      verification_status: 'not_started',
      can_send_requests: false,
      required_actions: ['make_payment']
    });
  });

  it('should respond within 100ms (P95)', async () => {
    const start = Date.now();

    await request(app)
      .get('/api/verification/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Date.now() - start).toBeLessThan(100);
  });
});
