# Messages Feature

## Overview

The Messages feature provides real-time encrypted messaging between matched users. Messages are encrypted at rest using AES-256-GCM and delivered in real-time via Socket.io. The feature supports cursor-based pagination for message history and includes typing indicators and read receipts.

## API Endpoints

### Wave 4 Endpoints (Current)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/messages/:matchId/history` | Get message history with pagination | Yes |
| POST | `/api/messages` | Send encrypted message | Yes |

### Legacy Endpoints (Backward Compatibility)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/messages/conversations` | Get all conversations | Yes |
| GET | `/api/messages/conversations/:userId` | Get conversation with user | Yes |
| GET | `/api/messages/unread-count` | Get unread message count | Yes |
| POST | `/api/messages/send` | Send message (legacy) | Yes |
| POST | `/api/messages/:conversationId/mark-read` | Mark messages as read | Yes |
| DELETE | `/api/messages/:messageId` | Delete a message | Yes |

## Services

### messageController
- `getMessageHistory` - Retrieves paginated message history for a match
- `sendMessage` - Sends encrypted message with real-time delivery
- `getConversations` - Gets all user conversations (legacy)
- `getConversation` - Gets conversation with specific user (legacy)
- `getUnreadCount` - Gets unread message count
- `markAsRead` - Marks messages as read
- `deleteMessage` - Soft deletes a message

### MessagesService
- `sendMessage(params)` - Encrypts and sends message, emits Socket.io event
- `getMessageHistory(params)` - Retrieves and decrypts message history
- `markAsRead(params)` - Marks message as read, emits read receipt
- `markConversationAsRead(matchId, userId)` - Marks all messages as read
- `emitTypingIndicator(params)` - Emits typing start/stop events
- `getUnreadCount(userId)` - Gets total unread count
- `getUserConversations(userId)` - Gets all conversations
- `deleteMessage(messageId, userId)` - Soft deletes a message

## Models/Types

### SendMessageParams
```typescript
interface SendMessageParams {
  matchId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string;
}
```

### MessageHistoryParams
```typescript
interface MessageHistoryParams {
  matchId: string;
  userId: string;
  cursor?: string;
  limit?: number;  // Default 20
}
```

### MessageResponse
```typescript
interface MessageResponse {
  id: string;
  matchId: string;
  senderId: string;
  content: string;          // Decrypted
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string | null;
  read: boolean;
  readAt?: string | null;
  sentAt: string;
  createdAt: string;
}
```

### MessageHistoryResponse
```typescript
interface MessageHistoryResponse {
  messages: MessageResponse[];
  nextCursor: string | null;
  totalCount?: number;
}
```

## Socket.io Events

### Emitted Events
| Event | Description | Data |
|-------|-------------|------|
| `new_message` | New message received | MessageResponse |
| `message_delivered` | Message delivery confirmation | { messageId, timestamp } |
| `message_read` | Message read receipt | { messageId, readBy, readAt } |
| `conversation_read` | All messages read | { matchId, readBy, readAt } |
| `typing_start` | User started typing | { userId, matchId } |
| `typing_stop` | User stopped typing | { userId, matchId } |

### User Rooms
- Each user joins room: `user:{userId}`
- Messages sent to recipient's room for real-time delivery

## Dependencies

- `../../middleware/auth.middleware` - authenticateJWT for authentication
- `../../middleware/rateLimit` - messageLimiter for rate limiting
- `../../middleware/validation` - Request validation
- `../../models/Message` - Message data model
- `../../models/Match` - Match verification
- `../../utils/encryption` - AES-256-GCM encryption/decryption
- `../../services/SocketService` - Real-time event emission

## Data Flow

### Send Message Flow
1. Authenticate user via JWT
2. Apply rate limiting
3. Verify user is participant in match
4. Verify match status is 'accepted'
5. Get or create conversation
6. Encrypt message content with AES-256-GCM
7. Store encrypted message in database
8. Emit `new_message` event to recipient
9. Emit `message_delivered` confirmation to sender
10. Return decrypted message to sender

### Get History Flow
1. Authenticate user via JWT
2. Verify user is participant in match
3. Get conversation
4. Retrieve messages with cursor-based pagination
5. Decrypt all messages
6. Calculate next cursor
7. Return decrypted messages with cursor

## Performance Targets

- Message history retrieval: <100ms P95
- Message send: <50ms P95
- Real-time delivery: <100ms

## Security Notes

- All messages encrypted at rest with AES-256-GCM
- Only match participants can access messages
- Match must be in 'accepted' status
- Messages decrypted only for authorized participants
- Rate limiting prevents spam (configurable)
