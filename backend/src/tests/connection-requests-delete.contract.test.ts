/**
 * Contract Test: DELETE /api/connection-requests/:id
 * Test: Cancel sent request (sender only, pending status only)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: DELETE /api/connection-requests/:id', () => {
  let authToken: string;
  let userId: string;
  let requestId: string;

  beforeAll(() => {
    authToken = 'mock-jwt-token';
    userId = '64c31337-4e0f-4a41-b537-db546f26ffee';
    requestId = 'request-001';
  });

  it('should cancel pending request successfully', async () => {
    await request(app)
      .delete(`/api/connection-requests/${requestId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);
  });

  it('should reject cancel from non-sender', async () => {
    const otherUserToken = 'mock-jwt-token-other';

    const response = await request(app)
      .delete(`/api/connection-requests/${requestId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('NOT_AUTHORIZED');
  });

  it('should reject cancel of accepted request', async () => {
    const acceptedId = 'request-accepted';

    const response = await request(app)
      .delete(`/api/connection-requests/${acceptedId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should return 404 for non-existent request', async () => {
    const response = await request(app)
      .delete('/api/connection-requests/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('CONNECTION_REQUEST_NOT_FOUND');
  });

  it('should respond within 100ms (P95)', async () => {
    const start = Date.now();

    await request(app)
      .delete(`/api/connection-requests/${requestId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);

    expect(Date.now() - start).toBeLessThan(100);
  });
});
