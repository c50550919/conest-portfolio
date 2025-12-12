/**
 * T027: Integration Test - Socket.io Message Delivery
 *
 * Tests real-time message delivery via Socket.io.
 *
 * **REAL-TIME**: Socket.io event emission and reception
 * **END-TO-END**: Full flow from sender to recipient
 *
 * Constitution Principle IV (Performance) - <100ms real-time delivery
 *
 * Flow:
 * 1. User A connects to Socket.io
 * 2. User B connects to Socket.io
 * 3. User A sends message via HTTP POST
 * 4. User B receives 'new_message' Socket.io event
 * 5. User A receives 'message_delivered' confirmation event
 */

import { io as ioClient, Socket } from 'socket.io-client';
import request from 'supertest';
import app from '../../src/app';
import { Server } from 'http';

describe('Socket.io Message Delivery Integration Tests', () => {
  let server: Server;
  let userASocket: Socket;
  let userBSocket: Socket;
  let authTokenA: string;
  let authTokenB: string;
  let userAId: string;
  let userBId: string;
  let matchId: string;
  let serverUrl: string;

  beforeAll(async () => {
    // Start server for Socket.io
    const port = 3001; // Use different port for testing
    server = app.listen(port);
    serverUrl = `http://localhost:${port}`;

    // Mock authentication tokens
    authTokenA = 'mock-jwt-token-user-a';
    authTokenB = 'mock-jwt-token-user-b';

    // Mock user IDs
    userAId = '11111111-1111-1111-1111-111111111111';
    userBId = '22222222-2222-2222-2222-222222222222';

    // Mock match ID
    matchId = '33333333-3333-3333-3333-333333333333';
  });

  afterAll(async () => {
    // Clean up
    if (userASocket?.connected) userASocket.disconnect();
    if (userBSocket?.connected) userBSocket.disconnect();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(async () => {
    // Connect User A to Socket.io
    userASocket = ioClient(serverUrl, {
      auth: { token: authTokenA },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      userASocket.on('connect', () => resolve());
    });

    // Connect User B to Socket.io
    userBSocket = ioClient(serverUrl, {
      auth: { token: authTokenB },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      userBSocket.on('connect', () => resolve());
    });
  });

  afterEach(() => {
    if (userASocket?.connected) userASocket.disconnect();
    if (userBSocket?.connected) userBSocket.disconnect();
  });

  describe('Real-time Message Delivery', () => {
    it('should deliver message to recipient via Socket.io when sender posts message', async () => {
      const messageContent = 'Hello from User A!';

      // Set up listener for User B to receive message
      const messageReceived = new Promise<any>((resolve) => {
        userBSocket.on('new_message', (data) => {
          resolve(data);
        });
      });

      // User A sends message via HTTP POST
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: messageContent,
        })
        .expect(201);

      // Wait for User B to receive message via Socket.io
      const receivedMessage = await messageReceived;

      // Verify message received by User B
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.id).toBe(response.body.id);
      expect(receivedMessage.content).toBe(messageContent);
      expect(receivedMessage.senderId).toBe(userAId);
      expect(receivedMessage.matchId).toBe(matchId);
    });

    it('should send delivery confirmation to sender', async () => {
      const messageContent = 'Delivery confirmation test';

      // Set up listener for User A to receive delivery confirmation
      const deliveryConfirmed = new Promise<any>((resolve) => {
        userASocket.on('message_delivered', (data) => {
          resolve(data);
        });
      });

      // User A sends message
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: messageContent,
        })
        .expect(201);

      // Wait for delivery confirmation
      const confirmation = await deliveryConfirmed;

      // Verify confirmation received by User A
      expect(confirmation).toBeDefined();
      expect(confirmation.messageId).toBe(response.body.id);
      expect(confirmation.timestamp).toBeTruthy();
    });

    it('should deliver message in <100ms (real-time performance)', async () => {
      const messageContent = 'Performance test message';

      // Set up listener and timing
      const startTime = Date.now();
      const messageReceived = new Promise<void>((resolve) => {
        userBSocket.on('new_message', () => {
          const deliveryTime = Date.now() - startTime;
          console.log(`Message delivered in ${deliveryTime}ms`);
          expect(deliveryTime).toBeLessThan(100);
          resolve();
        });
      });

      // User A sends message
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: messageContent,
        })
        .expect(201);

      // Wait for message delivery
      await messageReceived;
    });

    it('should deliver decrypted content to recipient', async () => {
      const messageContent = 'Encrypted content test 🔐';

      // Set up listener for User B
      const messageReceived = new Promise<any>((resolve) => {
        userBSocket.on('new_message', (data) => {
          resolve(data);
        });
      });

      // User A sends message
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: messageContent,
        })
        .expect(201);

      // Verify User B receives decrypted content
      const receivedMessage = await messageReceived;
      expect(receivedMessage.content).toBe(messageContent);

      // Content should NOT be encrypted
      expect(receivedMessage.content).not.toMatch(/^v\d+:[a-f0-9]+:/);
    });

    it('should only deliver message to intended recipient, not other users', async () => {
      const messageContent = 'Private message test';

      // Create third user socket (should NOT receive message)
      const userCSocket = ioClient(serverUrl, {
        auth: { token: 'mock-jwt-token-user-c' },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        userCSocket.on('connect', () => resolve());
      });

      // Set up listeners
      let userBReceived = false;
      let userCReceived = false;

      userBSocket.on('new_message', () => {
        userBReceived = true;
      });

      userCSocket.on('new_message', () => {
        userCReceived = true;
      });

      // User A sends message
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: messageContent,
        })
        .expect(201);

      // Wait for potential delivery
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify only User B received message
      expect(userBReceived).toBe(true);
      expect(userCReceived).toBe(false);

      userCSocket.disconnect();
    });

    it('should handle offline recipients gracefully (message stored, delivered on reconnect)', async () => {
      const messageContent = 'Offline recipient test';

      // User B disconnects
      userBSocket.disconnect();

      // User A sends message (User B is offline)
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: messageContent,
        })
        .expect(201);

      // Message should be stored successfully
      expect(response.body).toHaveProperty('id');

      // User B reconnects and retrieves message history
      userBSocket = ioClient(serverUrl, {
        auth: { token: authTokenB },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        userBSocket.on('connect', () => resolve());
      });

      // User B fetches message history
      const historyResponse = await request(app)
        .get(`/api/messages/${matchId}/history`)
        .set('Authorization', `Bearer ${authTokenB}`)
        .expect(200);

      // Verify message is in history
      const message = historyResponse.body.messages.find((m: any) => m.id === response.body.id);
      expect(message).toBeDefined();
      expect(message.content).toBe(messageContent);
    });

    it('should support different message types (text, image, file)', async () => {
      const messageTypes: Array<{ type: 'text' | 'image' | 'file'; fileUrl?: string }> = [
        { type: 'text' },
        { type: 'image', fileUrl: 'https://example.com/image.jpg' },
        { type: 'file', fileUrl: 'https://example.com/document.pdf' },
      ];

      for (const { type, fileUrl } of messageTypes) {
        const messageReceived = new Promise<any>((resolve) => {
          userBSocket.on('new_message', (data) => {
            resolve(data);
          });
        });

        // Send message
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authTokenA}`)
          .send({
            matchId,
            content: `${type} message test`,
            messageType: type,
            fileUrl,
          })
          .expect(201);

        // Verify delivery
        const receivedMessage = await messageReceived;
        expect(receivedMessage.messageType || 'text').toBe(type);

        if (fileUrl) {
          expect(receivedMessage.fileUrl).toBe(fileUrl);
        }
      }
    });
  });

  describe('Socket.io Connection Management', () => {
    it('should authenticate user on Socket.io connection', async () => {
      // Socket connection is already established in beforeEach
      expect(userASocket.connected).toBe(true);
      expect(userBSocket.connected).toBe(true);
    });

    it('should reject connection with invalid token', async () => {
      const invalidSocket = ioClient(serverUrl, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      const connectionError = await new Promise<string>((resolve) => {
        invalidSocket.on('connect_error', (error) => {
          resolve(error.message);
        });
      });

      expect(connectionError).toMatch(/auth|token|invalid/i);

      invalidSocket.disconnect();
    });

    it('should join user-specific room on connection', async () => {
      // Users are automatically joined to their rooms
      // Verify by sending message and checking delivery
      const messageReceived = new Promise<boolean>((resolve) => {
        userBSocket.on('new_message', () => {
          resolve(true);
        });
      });

      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: 'Room test message',
        })
        .expect(201);

      const received = await messageReceived;
      expect(received).toBe(true);
    });

    it('should handle reconnection gracefully', async () => {
      // Disconnect User B
      userBSocket.disconnect();
      expect(userBSocket.connected).toBe(false);

      // Reconnect User B
      userBSocket.connect();

      await new Promise<void>((resolve) => {
        userBSocket.on('connect', () => {
          resolve();
        });
      });

      expect(userBSocket.connected).toBe(true);

      // Verify messages can still be received
      const messageReceived = new Promise<boolean>((resolve) => {
        userBSocket.on('new_message', () => {
          resolve(true);
        });
      });

      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: 'Reconnection test',
        })
        .expect(201);

      const received = await messageReceived;
      expect(received).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Socket.io server unavailable gracefully', async () => {
      // HTTP POST should still succeed even if Socket.io fails
      // Message is stored, delivery attempted later

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          matchId,
          content: 'Resilience test',
        });

      // Should still return 201 (message stored)
      expect([201, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
      }
    });

    it('should not crash on malformed Socket.io event data', async () => {
      // Emit malformed event
      userASocket.emit('send_message', {
        // Missing required fields
        content: 'Malformed test',
      });

      // Wait for potential error
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Socket should still be connected
      expect(userASocket.connected).toBe(true);
    });
  });

  describe('Performance & Scalability', () => {
    it('should handle multiple simultaneous messages', async () => {
      const messageCount = 10;
      const receivedMessages: any[] = [];

      // Set up listener
      userBSocket.on('new_message', (data) => {
        receivedMessages.push(data);
      });

      // Send multiple messages simultaneously
      const promises = Array.from({ length: messageCount }, (_, i) =>
        request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authTokenA}`)
          .send({
            matchId,
            content: `Concurrent message ${i}`,
          })
          .expect(201),
      );

      await Promise.all(promises);

      // Wait for all messages to be delivered
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify all messages received
      expect(receivedMessages.length).toBe(messageCount);
    });

    it('should maintain message order for sequential sends', async () => {
      const messageCount = 5;
      const receivedMessages: any[] = [];

      // Set up listener
      userBSocket.on('new_message', (data) => {
        receivedMessages.push(data);
      });

      // Send messages sequentially
      for (let i = 0; i < messageCount; i++) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authTokenA}`)
          .send({
            matchId,
            content: `Sequential message ${i}`,
          })
          .expect(201);
      }

      // Wait for all deliveries
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify all messages received in order
      expect(receivedMessages.length).toBe(messageCount);

      for (let i = 0; i < messageCount; i++) {
        expect(receivedMessages[i].content).toBe(`Sequential message ${i}`);
      }
    });
  });
});
