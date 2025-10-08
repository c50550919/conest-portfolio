/**
 * Contract Test: POST /api/auth/verify-phone
 * TDD: MUST FAIL until AuthController.verifyPhone implemented
 */

import request from 'supertest';
import express, { Express } from 'express';

describe('POST /api/auth/verify-phone - Contract Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/api/auth/verify-phone', (_req, res) => res.status(501).json({ error: 'Not implemented' }));
  });

  it('should return 200 for valid verification code', async () => {
    const response = await request(app)
      .post('/api/auth/verify-phone')
      .send({ phone: '+1234567890', code: '123456' })
      .expect(200);

    expect(response.body).toHaveProperty('verified', true);
  });

  it('should return 400 for invalid code', async () => {
    await request(app)
      .post('/api/auth/verify-phone')
      .send({ phone: '+1234567890', code: '000000' })
      .expect(400);
  });

  it('should return 429 after 3 failed attempts', async () => {
    const payload = { phone: '+1234567890', code: '999999' };
    for (let i = 0; i < 3; i++) await request(app).post('/api/auth/verify-phone').send(payload);
    await request(app).post('/api/auth/verify-phone').send(payload).expect(429);
  });
});
