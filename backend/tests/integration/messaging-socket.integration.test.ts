/**
 * Messaging + Socket.io Integration Tests
 *
 * Purpose: Test the complete messaging flow with REAL database and Socket.io
 * Validates message persistence and real-time delivery
 *
 * Test Flow:
 * 1. Create 2 test users with accepted match
 * 2. Connect Socket.io client for user 2
 * 3. User 1 sends message via API
 * 4. Assert: message persisted in messages table
 * 5. Assert: Socket.io client receives `new_message` event
 *
 * Prerequisites:
 *   docker-compose -f docker-compose.test.yml up -d
 *
 * Run with:
 *   npm run test:integration -- messaging-socket
 */

import request from 'supertest';
import { Server } from 'http';
import { io as ioClient, Socket } from 'socket.io-client';
import app from '../../src/app';
import { initializeWebSocket } from '../../src/websockets/socketHandler';
import {
  db,
  createIntegrationTestUser,
  createConversation,
} from '../setup-integration';

// Track server and socket instances for cleanup
let server: Server;
let socketServer: ReturnType<typeof initializeWebSocket>;
const connectedSockets: Socket[] = [];

// Helper to create socket connection
function createSocketConnection(token: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });

    socket.on('connect', () => {
      connectedSockets.push(socket);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      reject(error);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 5000);
  });
}

// Helper to create accepted match between users
async function createAcceptedMatch(user1Id: string, user2Id: string): Promise<string> {
  const [match] = await db('matches')
    .insert({
      user1_id: user1Id,
      user2_id: user2Id,
      status: 'accepted',
      user1_liked: true,
      user2_liked: true,
      matched_at: new Date(),
      compatibility_score: 85,
    })
    .returning('id');

  return match.id;
}

describe('Messaging + Socket.io Integration', () => {
  const testPort = 3099; // Unique port for test server

  beforeAll(async () => {
    // Start server with Socket.io for testing
    server = app.listen(testPort);
    socketServer = initializeWebSocket(server);
  });

  afterAll(async () => {
    // Cleanup sockets
    connectedSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });

    // Close server
    await new Promise<void>((resolve) => {
      if (socketServer) {
        socketServer.close();
      }
      server.close(() => resolve());
    });
  });

  describe('Real-time Message Delivery', () => {
    it('should persist message and emit Socket.io event on send', async () => {
      // 1. Create two test users
      const user1 = await createIntegrationTestUser({
        email: `msg-user1-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      const user2 = await createIntegrationTestUser({
        email: `msg-user2-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      // 2. Create accepted match between users
      await createAcceptedMatch(user1.id, user2.id);

      // 3. Connect user2's Socket.io client to receive messages
      const user2Socket = await createSocketConnection(user2.token, testPort);

      // 4. Setup promise to capture incoming message
      const messagePromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Did not receive new_message event within timeout'));
        }, 5000);

        user2Socket.on('new_message', (message) => {
          clearTimeout(timeout);
          resolve(message);
        });
      });

      // 5. User1 sends message via REST API
      const messageContent = `Test message at ${Date.now()}`;
      const sendResponse = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.id,
          content: messageContent,
          messageType: 'text',
        })
        .expect(200);

      expect(sendResponse.body.success).toBe(true);
      expect(sendResponse.body.data).toBeDefined();

      // 6. Wait for Socket.io event
      const receivedMessage = await messagePromise;

      // 7. Verify received message content
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.content).toBe(messageContent);
      expect(receivedMessage.sender_id).toBe(user1.id);

      // 8. Verify message persisted in database
      const dbMessage = await db('messages')
        .where({ sender_id: user1.id })
        .orderBy('created_at', 'desc')
        .first();

      expect(dbMessage).toBeDefined();
      // Content is encrypted in DB, so we just verify it exists
      expect(dbMessage.content).toBeDefined();
      expect(dbMessage.message_type).toBe('text');

      // Cleanup
      user2Socket.disconnect();
    }, 15000); // Extended timeout for socket operations

    it('should reject message without accepted match', async () => {
      // Create two users WITHOUT a match
      const user1 = await createIntegrationTestUser({
        email: `msg-nomatch1-${Date.now()}@test.com`,
      });

      const user2 = await createIntegrationTestUser({
        email: `msg-nomatch2-${Date.now()}@test.com`,
      });

      // Try to send message
      const response = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.id,
          content: 'This should fail',
          messageType: 'text',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Message Persistence', () => {
    it('should store message with encryption', async () => {
      const user1 = await createIntegrationTestUser({
        email: `msg-encrypt1-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      const user2 = await createIntegrationTestUser({
        email: `msg-encrypt2-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      await createAcceptedMatch(user1.id, user2.id);

      const plainContent = 'Secret message content';

      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.id,
          content: plainContent,
          messageType: 'text',
        })
        .expect(200);

      // Verify message in DB is not plain text (encrypted)
      const dbMessage = await db('messages')
        .where({ sender_id: user1.id })
        .orderBy('created_at', 'desc')
        .first();

      expect(dbMessage.content).not.toBe(plainContent);
      // Base64 encoded content should be different from plain text
      expect(dbMessage.content).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
    });

    it('should retrieve decrypted message history', async () => {
      const user1 = await createIntegrationTestUser({
        email: `msg-history1-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      const user2 = await createIntegrationTestUser({
        email: `msg-history2-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      const matchId = await createAcceptedMatch(user1.id, user2.id);

      // Send multiple messages
      const messages = ['First message', 'Second message', 'Third message'];
      for (const content of messages) {
        await request(app)
          .post('/api/messages/send')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            recipientId: user2.id,
            content,
            messageType: 'text',
          })
          .expect(200);
      }

      // Retrieve message history
      const response = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      expect(response.body.data.messages.length).toBeGreaterThanOrEqual(3);

      // Verify messages are decrypted
      const retrievedMessages = response.body.data.messages;
      for (const msg of retrievedMessages) {
        expect(messages).toContain(msg.content);
      }
    });
  });

  describe('Conversation Management', () => {
    it('should create conversation on first message', async () => {
      const user1 = await createIntegrationTestUser({
        email: `msg-conv1-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      const user2 = await createIntegrationTestUser({
        email: `msg-conv2-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      await createAcceptedMatch(user1.id, user2.id);

      // Verify no conversation exists yet
      const convBefore = await db('conversations')
        .where(function() {
          this.where('participant1_id', user1.id).andWhere('participant2_id', user2.id);
        })
        .orWhere(function() {
          this.where('participant1_id', user2.id).andWhere('participant2_id', user1.id);
        })
        .first();

      expect(convBefore).toBeUndefined();

      // Send message to create conversation
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.id,
          content: 'Hello!',
          messageType: 'text',
        })
        .expect(200);

      // Verify conversation was created
      const convAfter = await db('conversations')
        .where(function() {
          this.where('participant1_id', user1.id).andWhere('participant2_id', user2.id);
        })
        .orWhere(function() {
          this.where('participant1_id', user2.id).andWhere('participant2_id', user1.id);
        })
        .first();

      expect(convAfter).toBeDefined();
    });

    it('should get user conversations list', async () => {
      const user1 = await createIntegrationTestUser({
        email: `msg-list1-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      const user2 = await createIntegrationTestUser({
        email: `msg-list2-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      await createAcceptedMatch(user1.id, user2.id);

      // Send a message to create conversation
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.id,
          content: 'Conversation starter',
          messageType: 'text',
        })
        .expect(200);

      // Get conversations list
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Socket.io Authentication', () => {
    it('should reject connection without token', async () => {
      await expect(
        new Promise<void>((resolve, reject) => {
          const socket = ioClient(`http://localhost:${testPort}`, {
            auth: {}, // No token
            transports: ['websocket'],
            forceNew: true,
          });

          socket.on('connect', () => {
            socket.disconnect();
            reject(new Error('Should not connect without token'));
          });

          socket.on('connect_error', (error) => {
            expect(error.message).toContain('Authentication required');
            resolve();
          });

          setTimeout(() => resolve(), 2000); // Timeout is success (connection rejected)
        })
      ).resolves.toBeUndefined();
    });

    it('should reject connection with invalid token', async () => {
      await expect(
        new Promise<void>((resolve, reject) => {
          const socket = ioClient(`http://localhost:${testPort}`, {
            auth: { token: 'invalid-token' },
            transports: ['websocket'],
            forceNew: true,
          });

          socket.on('connect', () => {
            socket.disconnect();
            reject(new Error('Should not connect with invalid token'));
          });

          socket.on('connect_error', (error) => {
            expect(error.message).toContain('Invalid token');
            resolve();
          });

          setTimeout(() => resolve(), 2000);
        })
      ).resolves.toBeUndefined();
    });

    it('should accept connection with valid token', async () => {
      const user = await createIntegrationTestUser({
        email: `socket-auth-${Date.now()}@test.com`,
      });

      const socket = await createSocketConnection(user.token, testPort);
      expect(socket.connected).toBe(true);
      socket.disconnect();
    });
  });
});
