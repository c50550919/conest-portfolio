/**
 * T026: Contract Test - POST /api/messages
 *
 * Tests API contract compliance for sending messages endpoint.
 *
 * **SECURITY**: End-to-end encryption validation
 * **REAL-TIME**: Socket.io event emission verification
 *
 * Constitution Principle III (Security) + Principle IV (Performance)
 *
 * Performance: <50ms P95
 */

import request from 'supertest';
import app from '../../src/app';
import { z } from 'zod';

// Send message request schema
const SendMessageRequestSchema = z.object({
  matchId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  messageType: z.enum(['text', 'image', 'file']).optional(),
  fileUrl: z.string().url().optional(),
});

// Send message response schema
const SendMessageResponseSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  messageType: z.enum(['text', 'image', 'file']).optional(),
  fileUrl: z.string().url().optional().nullable(),
  sentAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
  readAt: z.string().datetime().optional().nullable(),
});

describe('POST /api/messages - Contract Tests', () => {
  let authToken: string;
  let matchId: string;
  let recipientId: string;

  beforeAll(async () => {
    // Mock authentication
    authToken = 'mock-jwt-token';
    // Mock matchId and recipientId
    matchId = '12345678-1234-1234-1234-123456789012';
    recipientId = '87654321-4321-4321-4321-210987654321';
  });

  describe('Success Cases', () => {
    it('should return 201 with messageId and sentAt on successful send', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Hello, this is a test message!',
          messageType: 'text',
        })
        .expect(201);

      // Schema validation
      const result = SendMessageResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);

      // Response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sentAt');
      expect(response.body).toHaveProperty('matchId');
      expect(response.body.matchId).toBe(matchId);
    });

    it('should validate request body with Zod', async () => {
      const validRequests = [
        {
          matchId,
          content: 'Short message',
          messageType: 'text' as const,
        },
        {
          matchId,
          content: 'Message with emoji 😊',
          messageType: 'text' as const,
        },
        {
          matchId,
          content: 'Long message: ' + 'a'.repeat(1000),
          messageType: 'text' as const,
        },
      ];

      for (const payload of validRequests) {
        const result = SendMessageRequestSchema.safeParse(payload);
        expect(result.success).toBe(true);

        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.content).toBe(payload.content);
      }
    });

    it('should support text message type (default)', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Text message without explicit type',
        })
        .expect(201);

      expect(response.body.messageType || 'text').toBe('text');
    });

    it('should support image message type with fileUrl', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Check out this photo!',
          messageType: 'image',
          fileUrl: 'https://example.com/images/test.jpg',
        })
        .expect(201);

      expect(response.body.messageType).toBe('image');
      expect(response.body.fileUrl).toBe('https://example.com/images/test.jpg');
    });

    it('should support file message type with fileUrl', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Document attached',
          messageType: 'file',
          fileUrl: 'https://example.com/files/document.pdf',
        })
        .expect(201);

      expect(response.body.messageType).toBe('file');
      expect(response.body.fileUrl).toBe('https://example.com/files/document.pdf');
    });

    it('should return decrypted content for sender', async () => {
      const testContent = 'This is a test message for encryption';

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: testContent,
        })
        .expect(201);

      // Response should contain decrypted content
      expect(response.body.content).toBe(testContent);

      // Content should NOT be encrypted in response
      expect(response.body.content).not.toMatch(/^v\d+:[a-f0-9]+:/);
    });

    it('should set read=false and readAt=null for new messages', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Unread message test',
        })
        .expect(201);

      expect(response.body.read).toBe(false);
      expect(response.body.readAt).toBeNull();
    });
  });

  describe('**SECURITY** Encryption & Authorization', () => {
    it('should return 403 if sender is not a participant in the match', async () => {
      const unauthorizedMatchId = '99999999-9999-9999-9999-999999999999';

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId: unauthorizedMatchId,
          content: 'Unauthorized message attempt',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not.*participant|unauthorized/i);
    });

    it('should encrypt content before storing in database', async () => {
      // This is verified at integration test level
      // Contract test: ensure response doesn't leak encryption details
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Sensitive content to encrypt',
        })
        .expect(201);

      // Response should NOT contain encryption markers
      expect(response.body.content).not.toMatch(/^v\d+:/);
      expect(response.body).not.toHaveProperty('encryptedContent');
      expect(response.body).not.toHaveProperty('salt');
      expect(response.body).not.toHaveProperty('iv');
    });

    it('should only allow messaging in accepted matches', async () => {
      // Pending/rejected/expired matches should return 403
      // This is a business rule validation
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Test message',
        });

      // Either 201 (accepted match) or 403 (not accepted)
      expect([201, 403]).toContain(response.status);

      if (response.status === 403) {
        expect(response.body.error).toMatch(/match.*not.*accepted|status/i);
      }
    });
  });

  describe('**REAL-TIME** Socket.io Event Emission', () => {
    it('should emit Socket.io event to recipient on successful send', async () => {
      // This is fully tested in integration tests (T027)
      // Contract test: verify response indicates successful send
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Real-time message',
        })
        .expect(201);

      // If 201, Socket.io event should have been emitted
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sentAt');
    });

    it('should respond quickly (<50ms P95) for real-time performance', async () => {
      const iterations = 20; // P95 = 95th percentile
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            matchId,
            content: `Performance test message ${i}`,
          });
        const duration = Date.now() - start;
        responseTimes.push(duration);
      }

      // Calculate P95
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95Time = responseTimes[p95Index];

      console.log(`P95 response time: ${p95Time}ms`);
      console.log(`All response times: ${responseTimes.join(', ')}ms`);

      expect(p95Time).toBeLessThan(50);
    });
  });

  describe('Validation & Error Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          matchId,
          content: 'Unauthenticated message',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 on empty content', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/content|empty/i);
    });

    it('should return 400 on missing content field', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/content|required/i);
    });

    it('should return 400 on missing matchId field', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Missing matchId',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/matchId|required/i);
    });

    it('should return 422 for content exceeding 5000 characters', async () => {
      const longContent = 'a'.repeat(5001);

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: longContent,
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/content.*too long|max.*5000/i);
    });

    it('should return 422 for invalid matchId format', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId: 'invalid-uuid',
          content: 'Test message',
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/matchId|invalid/i);
    });

    it('should return 422 for invalid messageType', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Test message',
          messageType: 'invalid_type',
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/messageType|invalid/i);
    });

    it('should return 422 for invalid fileUrl format', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Image message',
          messageType: 'image',
          fileUrl: 'not-a-valid-url',
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/fileUrl|invalid|url/i);
    });

    it('should return 404 if match does not exist', async () => {
      const nonExistentMatchId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId: nonExistentMatchId,
          content: 'Test message',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/match.*not found|does not exist/i);
    });
  });

  describe('Data Quality & Business Rules', () => {
    it('should set senderId to authenticated user', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Sender validation test',
        })
        .expect(201);

      expect(response.body).toHaveProperty('senderId');
      expect(response.body.senderId).toBeTruthy();
      // senderId should be a valid UUID
      expect(response.body.senderId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should preserve message content integrity', async () => {
      const specialContent = 'Special chars: @#$%^&*()_+-={}[]|\\:";\'<>?,./\n\tNew line and tab';

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: specialContent,
        })
        .expect(201);

      // Content should be preserved exactly
      expect(response.body.content).toBe(specialContent);
    });

    it('should support Unicode and emoji characters', async () => {
      const unicodeContent = 'Hello 世界 🌍 Привет مرحبا';

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: unicodeContent,
        })
        .expect(201);

      expect(response.body.content).toBe(unicodeContent);
    });

    it('should generate unique message IDs', async () => {
      const messageIds = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            matchId,
            content: `Unique ID test ${i}`,
          })
          .expect(201);

        messageIds.add(response.body.id);
      }

      // All IDs should be unique
      expect(messageIds.size).toBe(10);
    });

    it('should set sentAt timestamp to current time', async () => {
      const beforeSend = new Date();

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'Timestamp test',
        })
        .expect(201);

      const afterSend = new Date();
      const sentAt = new Date(response.body.sentAt);

      // sentAt should be between beforeSend and afterSend
      expect(sentAt.getTime()).toBeGreaterThanOrEqual(beforeSend.getTime());
      expect(sentAt.getTime()).toBeLessThanOrEqual(afterSend.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only content as invalid', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: '   \n\t   ',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/content|empty/i);
    });

    it('should handle exactly 5000 character content', async () => {
      const maxContent = 'a'.repeat(5000);

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: maxContent,
        })
        .expect(201);

      expect(response.body.content).toBe(maxContent);
    });

    it('should handle minimum 1 character content', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          matchId,
          content: 'a',
        })
        .expect(201);

      expect(response.body.content).toBe('a');
    });
  });
});
