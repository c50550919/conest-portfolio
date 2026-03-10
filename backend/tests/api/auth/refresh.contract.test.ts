/**
 * Contract Test: POST /api/auth/refresh
 * TDD: MUST FAIL until AuthController.refresh implemented
 */

import request from 'supertest';
import express, { Express } from 'express';

// NOTE: These are TDD stub tests that intentionally return 501.
// Real contract tests are in tests/contract/auth-refresh.contract.test.ts
describe.skip('POST /api/auth/refresh - Contract Tests (TDD Stubs)', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/api/auth/refresh', (_req, res) =>
      res.status(501).json({ error: 'Not implemented' }),
    );
  });

  it('should return 200 with new tokens for valid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid.refresh.token' })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('expiresIn', 900);
  });

  it('should return 401 for expired refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired.refresh.token' })
      .expect(401);

    expect(response.body.error).toContain('expired');
  });

  it('should return 400 for missing refresh token', async () => {
    await request(app).post('/api/auth/refresh').send({}).expect(400);
  });
});
