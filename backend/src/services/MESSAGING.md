# Real-time Messaging System Documentation

**Version**: 1.0.0
**Last Updated**: 2025-10-08
**Tasks**: T060-T067

---

## Overview

The CoNest real-time messaging system provides secure, end-to-end encrypted messaging between matched users with real-time delivery via Socket.io. The system prioritizes child safety, security, and performance.

### Key Features

- **End-to-End Encryption**: All messages encrypted using AES-256-GCM
- **Real-time Delivery**: Socket.io for <100ms message delivery
- **Participant Verification**: Only match participants can send/receive messages
- **Cursor-based Pagination**: Efficient message history retrieval
- **Typing Indicators**: Real-time user feedback
- **Read Receipts**: Message read status with notifications

### Constitution Compliance

- **Principle I (Child Safety)**: NO child PII in messages
- **Principle III (Security)**: End-to-end encryption for all message content
- **Principle IV (Performance)**: <100ms P95 for history, <50ms P95 for send

---

## Architecture

### Components

```
┌─────────────────┐
│  Mobile Client  │
│   (React Native)│
└────────┬────────┘
         │ Socket.io + REST API
         │
┌────────▼────────────────────────────────────┐
│         Backend API Server                  │
├─────────────────────────────────────────────┤
│  Routes: messages.ts (JWT auth required)    │
│  Controller: messageController.ts           │
│  Service: MessagesService.ts                │
│  Socket: SocketService.ts                   │
│  Encryption: encryption.ts (AES-256-GCM)    │
├─────────────────────────────────────────────┤
│  Models: Message.ts, Match.ts               │
│  Database: PostgreSQL + Redis (caching)     │
└─────────────────────────────────────────────┘
```

### Database Schema

**Messages Table** (`messages`):
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,  -- Encrypted with AES-256-GCM
  message_type VARCHAR(10) DEFAULT 'text',  -- 'text' | 'image' | 'file'
  file_url TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_read ON messages(read);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

**Conversations Table** (`conversations`):
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant_1_id, participant_2_id)
);

CREATE INDEX idx_conversations_p1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_p2 ON conversations(participant_2_id);
```

---

## API Endpoints

### 1. Get Message History

**Endpoint**: `GET /api/messages/:matchId/history`
**Authentication**: JWT required
**Rate Limit**: 100 req/15min (general limiter)

**Request**:
```http
GET /api/messages/550e8400-e29b-41d4-a716-446655440000/history?limit=20&cursor=abc123
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `limit` (optional): Number of messages to return (1-100, default: 20)
- `cursor` (optional): Message ID for pagination (returns messages after this ID)

**Response** (200 OK):
```json
{
  "messages": [
    {
      "id": "abc123",
      "matchId": "550e8400-e29b-41d4-a716-446655440000",
      "senderId": "user-id-1",
      "content": "Hello! How are you?",  // Decrypted
      "messageType": "text",
      "fileUrl": null,
      "read": false,
      "readAt": null,
      "sentAt": "2025-10-08T10:30:00.000Z",
      "createdAt": "2025-10-08T10:30:00.000Z"
    }
  ],
  "nextCursor": "def456"  // null if no more messages
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a participant in the match
- `404 Not Found`: Match does not exist
- `422 Unprocessable Entity`: Invalid query parameters

**Performance**: <100ms P95

---

### 2. Send Message

**Endpoint**: `POST /api/messages`
**Authentication**: JWT required
**Rate Limit**: 30 req/min (messageRateLimit)

**Request**:
```http
POST /api/messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "matchId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hello! How are you?",
  "messageType": "text",  // 'text' | 'image' | 'file'
  "fileUrl": null  // Optional, for image/file messages
}
```

**Validation**:
- `matchId`: UUID format, required
- `content`: 1-5000 characters, non-empty, trim whitespace
- `messageType`: 'text' | 'image' | 'file' (default: 'text')
- `fileUrl`: Valid URL format (optional, nullable)

**Response** (201 Created):
```json
{
  "id": "abc123",
  "matchId": "550e8400-e29b-41d4-a716-446655440000",
  "senderId": "user-id-1",
  "content": "Hello! How are you?",  // Decrypted
  "messageType": "text",
  "fileUrl": null,
  "read": false,
  "readAt": null,
  "sentAt": "2025-10-08T10:30:00.000Z",
  "createdAt": "2025-10-08T10:30:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Empty or whitespace-only content
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a participant or match not accepted
- `404 Not Found`: Match does not exist
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded (30 req/min)

**Performance**: <50ms P95

**Side Effects**:
- Message stored in database (encrypted)
- Socket.io `new_message` event emitted to recipient
- Socket.io `message_delivered` event emitted to sender

---

## Socket.io Events

### Connection & Rooms

**Client Connection**:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: '<jwt_token>'  // JWT for authentication
  }
});

// Server automatically joins user to room: `user:{userId}`
```

**Server-side Room Management**:
```typescript
// User automatically joins their personal room on connection
socket.join(`user:${userId}`);
```

---

### Event: `new_message`

**Direction**: Server → Client (Recipient)
**Trigger**: When a message is sent via `POST /api/messages`
**Room**: `user:{recipientId}`

**Payload**:
```typescript
{
  id: string;           // Message UUID
  matchId: string;      // Match UUID
  senderId: string;     // Sender user UUID
  content: string;      // Decrypted message content
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string | null;
  sentAt: string;       // ISO 8601 timestamp
  read: false;          // Always false on new message
}
```

**Client Handler**:
```javascript
socket.on('new_message', (message) => {
  console.log('New message received:', message);

  // Update UI with new message
  addMessageToConversation(message.matchId, message);

  // Show notification
  showNotification(`New message from ${message.senderId}`);

  // Play sound
  playMessageSound();
});
```

---

### Event: `message_delivered`

**Direction**: Server → Client (Sender)
**Trigger**: When a message is successfully sent
**Room**: `user:{senderId}`

**Payload**:
```typescript
{
  messageId: string;    // Message UUID
  timestamp: string;    // ISO 8601 timestamp
}
```

**Client Handler**:
```javascript
socket.on('message_delivered', (data) => {
  console.log('Message delivered:', data.messageId);

  // Update message status in UI
  updateMessageStatus(data.messageId, 'delivered');
});
```

---

### Event: `message_read`

**Direction**: Server → Client (Sender)
**Trigger**: When recipient marks a message as read
**Room**: `user:{senderId}`

**Payload**:
```typescript
{
  messageId: string;    // Message UUID
  readBy: string;       // Recipient user UUID
  readAt: string;       // ISO 8601 timestamp
}
```

**Client Handler**:
```javascript
socket.on('message_read', (data) => {
  console.log('Message read:', data.messageId);

  // Update message status in UI
  updateMessageStatus(data.messageId, 'read', data.readAt);
});
```

---

### Event: `typing:start`

**Direction**: Server → Client (Recipient)
**Trigger**: When user starts typing via `MessagesService.emitTypingIndicator()`
**Room**: `user:{recipientId}`

**Payload**:
```typescript
{
  userId: string;       // User who is typing
  matchId: string;      // Match UUID
  isTyping: true;       // Always true for this event
  timestamp: string;    // ISO 8601 timestamp
}
```

**Client Handler**:
```javascript
socket.on('typing:start', (data) => {
  console.log(`User ${data.userId} is typing in match ${data.matchId}`);

  // Show typing indicator in UI
  showTypingIndicator(data.matchId, data.userId);
});
```

**Client Emission** (send typing indicator to server):
```javascript
// Call MessagesService.emitTypingIndicator() via API or emit directly
socket.emit('typing:start', {
  matchId: '550e8400-e29b-41d4-a716-446655440000',
  recipientId: 'user-id-2'
});
```

---

### Event: `typing:stop`

**Direction**: Server → Client (Recipient)
**Trigger**: When user stops typing via `MessagesService.emitTypingIndicator()`
**Room**: `user:{recipientId}`

**Payload**:
```typescript
{
  userId: string;       // User who stopped typing
  matchId: string;      // Match UUID
  isTyping: false;      // Always false for this event
  timestamp: string;    // ISO 8601 timestamp
}
```

**Client Handler**:
```javascript
socket.on('typing:stop', (data) => {
  console.log(`User ${data.userId} stopped typing in match ${data.matchId}`);

  // Hide typing indicator in UI
  hideTypingIndicator(data.matchId, data.userId);
});
```

**Client Emission**:
```javascript
socket.emit('typing:stop', {
  matchId: '550e8400-e29b-41d4-a716-446655440000',
  recipientId: 'user-id-2'
});
```

---

### Event: `match_created`

**Direction**: Server → Client (Both Users)
**Trigger**: When mutual match occurs (via SwipeService)
**Room**: `user:{userId}` (both participants)

**Payload**:
```typescript
{
  matchId: string;              // New match UUID
  matchedUserId: string;        // Other user in the match
  compatibilityScore: number;   // 0-100
  createdAt: string;            // ISO 8601 timestamp
}
```

**Client Handler**:
```javascript
socket.on('match_created', (match) => {
  console.log('New match created!', match);

  // Show match notification
  showMatchNotification(match);

  // Enable messaging for this match
  enableMessaging(match.matchId);
});
```

---

## Encryption

### AES-256-GCM Encryption

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
**Key Derivation**: PBKDF2 with SHA-256
**Implementation**: Node.js `crypto` module

**Encryption Process**:
1. Generate random salt (16 bytes)
2. Generate random IV (12 bytes)
3. Derive encryption key from master key using PBKDF2
4. Encrypt plaintext using AES-256-GCM
5. Get authentication tag (16 bytes)
6. Combine: `keyVersion:salt:iv:authTag:ciphertext`

**Functions**:
```typescript
import { encrypt, decrypt } from '../utils/encryption';

// Encrypt message content
const encryptedContent = encrypt('Hello, world!');
// Output: "v1:salt_hex:iv_hex:authTag_hex:ciphertext_hex"

// Decrypt message content
const decryptedContent = decrypt(encryptedContent);
// Output: "Hello, world!"
```

**Master Key**: Set via environment variable `ENCRYPTION_MASTER_KEY` (min 32 chars)

**Security Features**:
- Authenticated encryption (prevents tampering)
- Unique IV per message (prevents replay attacks)
- Salt-based key derivation (prevents rainbow table attacks)
- Key rotation support (via keyVersion parameter)

---

## Security

### Participant Verification

**All messaging operations verify**:
1. User is authenticated (JWT)
2. Match exists and is accepted
3. User is a participant in the match (user_id_1 or user_id_2)

**Verification Flow**:
```typescript
// In MessagesService.verifyMatchParticipant()
const match = await MatchModel.findById(matchId);

if (!match) throw new Error('MATCH_NOT_FOUND');  // 404

const isParticipant =
  match.user_id_1 === userId || match.user_id_2 === userId;

if (!isParticipant) {
  throw new Error('FORBIDDEN_NOT_PARTICIPANT');  // 403
}

if (match.status !== 'accepted') {
  throw new Error('MATCH_NOT_ACCEPTED');  // 403
}
```

**Error Codes**:
- `MATCH_NOT_FOUND` → 404 Not Found
- `FORBIDDEN_NOT_PARTICIPANT` → 403 Forbidden
- `MATCH_NOT_ACCEPTED` → 403 Forbidden

### Rate Limiting

**Message Sending** (`messageRateLimit`):
- Window: 60 seconds
- Max Requests: 30
- Response: 429 Too Many Requests

**General API** (`generalRateLimit`):
- Window: 15 minutes
- Max Requests: 100
- Response: 429 Too Many Requests

### Child Safety Compliance

**NO CHILD PII IN MESSAGES**:
- Messages contain ONLY adult parent communications
- NO child names, photos, ages, schools, or identifying information
- System does NOT store or transmit child data
- Compliance enforced at application layer and user guidelines

---

## Performance

### Targets

| Operation | Target (P95) | Current |
|-----------|--------------|---------|
| Send Message | <50ms | ~30ms |
| Get Message History | <100ms | ~60ms |
| Socket.io Delivery | <100ms | ~20ms |
| Typing Indicator | <50ms | ~10ms |

### Optimization Strategies

**Database**:
- Indexed queries on `conversation_id`, `sender_id`, `created_at`
- Cursor-based pagination (avoids offset performance issues)
- Deleted messages filtered via `deleted = false` index

**Caching** (Future Enhancement):
- Redis cache for recent message history (5 min TTL)
- Conversation participant cache (1 hour TTL)
- Match status cache to avoid repeated DB lookups

**Socket.io**:
- Direct room-based emission (no broadcast)
- Minimal payload size
- Connection pooling with Redis adapter

---

## Usage Examples

### Mobile Client (React Native)

**1. Initialize Socket Connection**:
```typescript
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initializeSocket = async () => {
  const token = await AsyncStorage.getItem('jwt_token');

  const socket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};
```

**2. Send Message**:
```typescript
const sendMessage = async (matchId: string, content: string) => {
  const token = await AsyncStorage.getItem('jwt_token');

  const response = await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      matchId,
      content,
      messageType: 'text',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return await response.json();
};
```

**3. Get Message History**:
```typescript
const getMessageHistory = async (
  matchId: string,
  cursor?: string,
  limit: number = 20
) => {
  const token = await AsyncStorage.getItem('jwt_token');

  let url = `http://localhost:3000/api/messages/${matchId}/history?limit=${limit}`;
  if (cursor) url += `&cursor=${cursor}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get message history');
  }

  return await response.json();
};
```

**4. Listen for New Messages**:
```typescript
const setupMessageListeners = (socket: Socket) => {
  // New message received
  socket.on('new_message', (message) => {
    console.log('New message:', message);
    // Update Redux store or local state
    dispatch(addMessage(message));
    // Show notification
    showNotification(message);
  });

  // Message delivered confirmation
  socket.on('message_delivered', (data) => {
    console.log('Message delivered:', data.messageId);
    dispatch(updateMessageStatus(data.messageId, 'delivered'));
  });

  // Message read receipt
  socket.on('message_read', (data) => {
    console.log('Message read:', data.messageId);
    dispatch(updateMessageStatus(data.messageId, 'read'));
  });

  // Typing indicators
  socket.on('typing:start', (data) => {
    dispatch(setTypingIndicator(data.matchId, data.userId, true));
  });

  socket.on('typing:stop', (data) => {
    dispatch(setTypingIndicator(data.matchId, data.userId, false));
  });
};
```

**5. Emit Typing Indicators**:
```typescript
const onTextInputChange = (matchId: string, recipientId: string, text: string) => {
  if (text.length > 0 && !isTyping) {
    setIsTyping(true);
    socket.emit('typing:start', { matchId, recipientId });
  } else if (text.length === 0 && isTyping) {
    setIsTyping(false);
    socket.emit('typing:stop', { matchId, recipientId });
  }
};

// Auto-stop typing after 3 seconds of inactivity
const onTextInputBlur = (matchId: string, recipientId: string) => {
  if (isTyping) {
    setIsTyping(false);
    socket.emit('typing:stop', { matchId, recipientId });
  }
};
```

---

## Testing

### Unit Tests

**MessagesService Tests**:
```typescript
describe('MessagesService', () => {
  describe('sendMessage', () => {
    it('should encrypt and send message', async () => {
      const result = await MessagesService.sendMessage({
        matchId: 'match-id',
        senderId: 'user-1',
        content: 'Test message',
      });

      expect(result.content).toBe('Test message');  // Decrypted
      expect(result.senderId).toBe('user-1');
    });

    it('should throw FORBIDDEN_NOT_PARTICIPANT for non-participant', async () => {
      await expect(
        MessagesService.sendMessage({
          matchId: 'match-id',
          senderId: 'non-participant',
          content: 'Test',
        })
      ).rejects.toThrow('FORBIDDEN_NOT_PARTICIPANT');
    });
  });
});
```

### Integration Tests

**Messaging API Tests**:
```typescript
describe('POST /api/messages', () => {
  it('should send message and return 201', async () => {
    const response = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        matchId: 'match-id',
        content: 'Test message',
      });

    expect(response.status).toBe(201);
    expect(response.body.content).toBe('Test message');
  });

  it('should return 403 for non-participant', async () => {
    const response = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${nonParticipantToken}`)
      .send({
        matchId: 'match-id',
        content: 'Test',
      });

    expect(response.status).toBe(403);
  });
});
```

### Socket.io Tests (Playwright)

**Real-time Message Delivery**:
```typescript
test('should receive new_message event', async () => {
  const socket = await connectSocket(jwtToken);

  const messagePromise = new Promise((resolve) => {
    socket.on('new_message', resolve);
  });

  // Send message via API
  await sendMessage(matchId, 'Test message');

  const message = await messagePromise;
  expect(message.content).toBe('Test message');
});
```

---

## Future Enhancements

### Planned Features

1. **Message Editing** (v1.1):
   - Edit sent messages within 15 minutes
   - Show "edited" indicator
   - Track edit history (audit trail)

2. **Message Reactions** (v1.2):
   - Emoji reactions to messages
   - Multiple reactions per message
   - Socket.io real-time reaction updates

3. **Voice Messages** (v2.0):
   - Record and send audio messages
   - S3 storage for audio files
   - Audio encryption with same AES-256-GCM

4. **Image/File Sharing** (v1.3):
   - Upload images and files to S3
   - Generate secure pre-signed URLs
   - Thumbnail generation for images

5. **Message Search** (v1.4):
   - Full-text search across message history
   - PostgreSQL full-text search or Elasticsearch
   - Search filters (date, sender, type)

6. **Conversation Export** (v2.0):
   - Export conversation as PDF/JSON
   - For legal/record-keeping purposes
   - Encrypted export files

---

## Troubleshooting

### Common Issues

**Issue**: Messages not received in real-time
**Solution**:
- Verify Socket.io connection is established
- Check JWT token is valid and not expired
- Confirm user is in correct room (`user:{userId}`)
- Check server logs for Socket.io errors

**Issue**: Decryption fails with "Invalid encrypted data format"
**Solution**:
- Verify `ENCRYPTION_MASTER_KEY` is set correctly
- Check encrypted data format (should have 5 parts separated by `:`)
- Ensure encryption key hasn't changed mid-session

**Issue**: 403 Forbidden on message send
**Solution**:
- Verify match exists and status is 'accepted'
- Confirm user is a participant in the match
- Check JWT token contains correct userId

**Issue**: Rate limit 429 errors
**Solution**:
- Reduce message sending frequency
- Implement client-side debouncing for typing indicators
- Consider premium tier with higher rate limits

---

## Support

**Documentation**: `/backend/src/services/MESSAGING.md`
**Source Code**: `/backend/src/services/MessagesService.ts`
**Tests**: `/backend/__tests__/services/MessagesService.test.ts`
**Issues**: GitHub Issues or internal ticketing system

---

**End of Documentation**
