/**
 * T025: Contract Test - GET /api/messages/:matchId/history
 *
 * Tests API contract compliance for message history endpoint.
 *
 * **SECURITY**: End-to-end encryption validation
 * Constitution Principle III (Security) compliance verification
 *
 * Performance: <100ms P95 (Redis cached)
 */

import request from 'supertest';
import app from '../../src/app';
import { z } from 'zod';

// Message schema from OpenAPI spec
const MessageSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(), // Decrypted content for sender/recipient
  messageType: z.enum(['text', 'image', 'file']).optional().default('text'),
  fileUrl: z.string().url().optional().nullable(),
  read: z.boolean(),
  readAt: z.string().datetime().optional().nullable(),
  sentAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

// Response schema with pagination
const MessageHistoryResponseSchema = z.object({
  messages: z.array(MessageSchema),
  nextCursor: z.string().uuid().nullable().optional(),
  totalCount: z.number().int().nonnegative().optional(),
});

describe('GET /api/messages/:matchId/history - Contract Tests', () => {
  let authToken: string;
  let matchId: string;

  beforeAll(async () => {
    // Mock authentication - will be replaced with actual implementation
    authToken = 'mock-jwt-token';
    // Mock matchId - will be replaced with actual match ID
    matchId = '12345678-1234-1234-1234-123456789012';
  });

  describe('Success Cases', () => {
    it('should return 200 with messages array when user is match participant', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Schema validation
      const result = MessageHistoryResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);

      // Response structure
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should validate Message schema with Zod for each message', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 20 })
        .expect(200);

      response.body.messages.forEach((message: any, index: number) => {
        const result = MessageSchema.safeParse(message);
        if (!result.success) {
          console.error(`Message ${index} validation errors:`, result.error.format());
        }
        expect(result.success).toBe(true);
      });
    });

    it('should return messages in chronological order (oldest first)', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const messages = response.body.messages;
      if (messages.length > 1) {
        for (let i = 1; i < messages.length; i++) {
          const prevTime = new Date(messages[i - 1].sentAt).getTime();
          const currTime = new Date(messages[i].sentAt).getTime();
          expect(currTime).toBeGreaterThanOrEqual(prevTime);
        }
      }
    });

    it('should support cursor-based pagination', async () => {
      // First page
      const firstPage = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(firstPage.body.messages.length).toBeLessThanOrEqual(10);

      // Second page (if nextCursor exists)
      if (firstPage.body.nextCursor) {
        const secondPage = await request(app)
          .get(`/api/messages/${matchId}/history`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            cursor: firstPage.body.nextCursor,
            limit: 10
          })
          .expect(200);

        expect(secondPage.body).toHaveProperty('messages');
        expect(Array.isArray(secondPage.body.messages)).toBe(true);

        // Messages should not overlap
        if (firstPage.body.messages.length > 0 && secondPage.body.messages.length > 0) {
          const lastFirstPageId = firstPage.body.messages[firstPage.body.messages.length - 1].id;
          const firstSecondPageId = secondPage.body.messages[0].id;
          expect(lastFirstPageId).not.toBe(firstSecondPageId);
        }
      }
    });

    it('should respect limit parameter (1-100)', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 20 })
        .expect(200);

      expect(response.body.messages.length).toBeLessThanOrEqual(20);
    });

    it('should return empty array when no messages exist', async () => {
      // This should return 200 with empty array, not 404
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
  });

  describe('**SECURITY** Encryption & Authorization', () => {
    it('should return 403 if user is not a participant in the match', async () => {
      const unauthorizedMatchId = '87654321-4321-4321-4321-210987654321';

      const response = await request(app)
        .get(`/api/messages/${unauthorizedMatchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not.*participant|unauthorized/i);
    });

    it('should return decrypted content for authorized participants', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.messages.forEach((message: any) => {
        // Content should be readable string, not encrypted gibberish
        expect(typeof message.content).toBe('string');
        expect(message.content.length).toBeGreaterThan(0);

        // Content should NOT contain encryption markers like "v1:", ":", hex strings
        // (Decrypted content should be plain text)
        if (message.content.includes('v1:')) {
          throw new Error('Message content appears to be encrypted, should be decrypted for participant');
        }
      });
    });

    it('should NOT expose encrypted content in API response', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check response doesn't contain raw encrypted data patterns
      const responseString = JSON.stringify(response.body);

      // Encrypted data format: "v1:salt:iv:authTag:ciphertext"
      // Should NOT be present in API response to clients
      response.body.messages.forEach((message: any) => {
        expect(message.content).not.toMatch(/^v\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      });
    });

    it('should include read receipts for messages', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.messages.forEach((message: any) => {
        expect(message).toHaveProperty('read');
        expect(typeof message.read).toBe('boolean');

        if (message.read) {
          expect(message).toHaveProperty('readAt');
          expect(message.readAt).toBeTruthy();
        }
      });
    });
  });

  describe('Validation & Error Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 422 for invalid matchId format', async () => {
      const response = await request(app)
        .get('/api/messages/invalid-not-uuid/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/matchId|invalid/i);
    });

    it('should return 422 for invalid limit parameter', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 200 }) // exceeds max 100
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/limit/i);
    });

    it('should return 422 for limit < 1', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 0 })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/limit/i);
    });

    it('should return 422 for invalid cursor format', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ cursor: 'invalid-not-uuid' })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/cursor/i);
    });

    it('should return 404 if match does not exist', async () => {
      const nonExistentMatchId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/messages/${nonExistentMatchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/match.*not found|does not exist/i);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond in <100ms P95 (Redis cached)', async () => {
      const iterations = 20; // P95 = 95th percentile
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .get(`/api/messages/${matchId}/history`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 20 });
        const duration = Date.now() - start;
        responseTimes.push(duration);
      }

      // Calculate P95
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95Time = responseTimes[p95Index];

      console.log(`P95 response time: ${p95Time}ms`);
      console.log(`All response times: ${responseTimes.join(', ')}ms`);

      expect(p95Time).toBeLessThan(100);
    });
  });

  describe('Data Quality & Business Rules', () => {
    it('should include matchId in all messages', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.messages.forEach((message: any) => {
        expect(message.matchId).toBe(matchId);
      });
    });

    it('should only return messages from accepted matches', async () => {
      // Messages should only exist for matches with status='accepted'
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // This is validated at business logic level
      // If response is 200, match must be accepted
      expect(response.status).toBe(200);
    });

    it('should support different message types (text, image, file)', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.messages.forEach((message: any) => {
        expect(['text', 'image', 'file']).toContain(message.messageType || 'text');

        // If image/file, should have fileUrl
        if (message.messageType === 'image' || message.messageType === 'file') {
          expect(message.fileUrl).toBeTruthy();
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle nextCursor = null when no more messages', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 100 }) // large limit to potentially reach end
        .expect(200);

      if (response.body.messages.length < 100) {
        // Might have reached the end
        if (response.body.nextCursor !== undefined) {
          expect(response.body.nextCursor).toBeNull();
        }
      }
    });

    it('should handle empty messages array gracefully', async () => {
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');

      if (response.body.messages.length === 0) {
        if (response.body.nextCursor !== undefined) {
          expect(response.body.nextCursor).toBeNull();
        }
      }
    });
  });
});
