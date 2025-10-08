# Socket.io Connection Handling Documentation

## Overview
Real-time messaging system using Socket.io for the CoNest mobile app with robust offline support and reconnection handling.

## Architecture

### Connection Flow
```
1. App Launch
   ↓
2. User Authentication
   ↓
3. Socket.connect() with JWT token
   ↓
4. Server validates token
   ↓
5. Connection established
   ↓
6. Event listeners registered
```

### Authentication
- JWT token stored in AsyncStorage
- Passed via Socket.io auth option on connection
- Token automatically attached to connection request
- Server validates token before accepting connection

```typescript
const token = await AsyncStorage.getItem('authToken');
this.socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['websocket'],
  // ... other options
});
```

## Connection States

### Connected
- `socket.connected === true`
- All real-time features active
- Messages sent/received instantly
- Typing indicators working
- Read receipts synchronized

### Disconnected
- `socket.connected === false`
- Messages queued in retry queue
- Typing indicators disabled
- Read receipts deferred
- Auto-reconnection attempts active

### Reconnecting
- Automatic reconnection with exponential backoff
- Max 5 reconnection attempts
- Delays: 1s, 2s, 4s, 8s, 16s
- User notified after max attempts

## Event Listeners

### Server → Client Events

#### `match.created`
**Description**: Emitted when two users mutually like each other
**Payload**:
```typescript
{
  matchId: string;
  matchedUserId: string;
  compatibilityScore: number;
  createdAt: string;
}
```
**Handler**:
```typescript
socketService.onMatchCreated((data) => {
  // Show notification
  // Update matches list
  // Navigate to chat (optional)
});
```

#### `message.received`
**Description**: Real-time message delivery
**Payload**:
```typescript
{
  messageId: string;
  matchId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image';
  fileUrl?: string;
  timestamp: string;
}
```
**Handler**:
```typescript
socketService.onMessageReceived((data) => {
  // Append to conversation
  // Update Redux store
  // Show notification (if background)
  // Mark as read (if viewing conversation)
});
```

#### `typing:start`
**Description**: User started typing
**Payload**:
```typescript
{
  matchId: string;
  userId: string;
  isTyping: true;
}
```
**Handler**:
```typescript
socketService.onTypingStart((data) => {
  // Show "User is typing..." indicator
  setIsTyping(true);
});
```

#### `typing:stop`
**Description**: User stopped typing
**Payload**:
```typescript
{
  matchId: string;
  userId: string;
  isTyping: false;
}
```
**Handler**:
```typescript
socketService.onTypingStop((data) => {
  // Hide typing indicator
  setIsTyping(false);
});
```

#### `message.read`
**Description**: Message read receipt
**Payload**:
```typescript
{
  messageId: string;
  matchId: string;
  readBy: string;
  readAt: string;
}
```
**Handler**:
```typescript
socketService.onMessageRead((data) => {
  // Update message status to 'read'
  // Show double checkmark
});
```

### Client → Server Events

#### `typing:start`
**Description**: Notify server user started typing
**Emit**:
```typescript
socketService.emitTypingStart(matchId);
```
**Implementation**:
- Debounced (fires once per typing session)
- Auto-expires after 3 seconds
- Cancelled on message send

#### `typing:stop`
**Description**: Notify server user stopped typing
**Emit**:
```typescript
socketService.emitTypingStop(matchId);
```
**Implementation**:
- Fired on message send
- Fired after 3s timeout
- Fired on input clear

## Reconnection Strategy

### Automatic Reconnection
```typescript
reconnection: true,
reconnectionAttempts: 5,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
```

### Reconnection Flow
1. **Connection Lost**: Network interruption or server restart
2. **Auto-Retry**: Socket.io automatically attempts reconnection
3. **Exponential Backoff**: Delays increase: 1s → 2s → 4s → 8s → 16s
4. **Success**: Connection restored, event listeners re-registered
5. **Failure**: After 5 attempts, manual reconnection required

### Manual Reconnection
```typescript
// User triggers manual reconnect
if (!socketService.connected()) {
  await socketService.connect();
}
```

## Offline Support

### Message Retry Queue
When network is unavailable or Socket.io disconnected:

1. **Optimistic UI Update**: Message shown immediately in UI
2. **Queue Addition**: Failed send added to retry queue
3. **Auto-Retry**: When connection restored, queue processed
4. **Max Retries**: 3 attempts per message
5. **Failure Handling**: User notified, option to retry manually

```typescript
// Retry queue processing
await messagesAPI.processRetryQueue();

// Check queue size
const pendingCount = messagesAPI.getRetryQueueSize();
```

### Network State Detection
```typescript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener((state) => {
  if (state.isConnected && !socketService.connected()) {
    // Network restored, reconnect socket
    socketService.connect();

    // Process retry queue
    messagesAPI.processRetryQueue();
  }
});
```

## Error Handling

### Connection Errors
```typescript
socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  // Show user-friendly error message
  // Increment retry counter
  // Disable real-time features temporarily
});
```

### Authentication Errors
```typescript
// 401 Unauthorized - token invalid
if (error.response?.status === 401) {
  await AsyncStorage.removeItem('authToken');
  // Navigate to login screen
  socketService.disconnect();
}
```

### Message Send Errors
```typescript
try {
  await messagesAPI.sendMessage(matchId, content);
} catch (error) {
  // Message added to retry queue automatically
  // Show "Message failed to send" indicator
  // Provide manual retry option
}
```

## Performance Optimizations

### Message Batching
- Group multiple messages in single state update
- Reduce re-renders with React.memo
- Virtualize message list with FlatList

### Event Throttling
- Typing indicators debounced (3s timeout)
- Read receipts batched per conversation
- Message history paginated (50 messages/request)

### Memory Management
- Unregister event listeners on unmount
- Clear message cache when leaving conversation
- Limit in-memory messages to last 100 per conversation

## Testing

### Connection Testing
```typescript
// Test connection
const isConnected = socketService.connected();

// Test reconnection
socketService.disconnect();
await socketService.connect();
```

### Event Testing
```typescript
// Mock incoming message
const mockMessage = {
  messageId: 'test-123',
  matchId: 'match-456',
  senderId: 'user-789',
  content: 'Test message',
  messageType: 'text',
  timestamp: new Date().toISOString(),
};

socketService.onMessageReceived((data) => {
  expect(data).toEqual(mockMessage);
});
```

### Retry Queue Testing
```typescript
// Test retry queue
await messagesAPI.sendMessage('match-123', 'Test'); // Will fail without network
expect(messagesAPI.getRetryQueueSize()).toBe(1);

// Restore network
await messagesAPI.processRetryQueue();
expect(messagesAPI.getRetryQueueSize()).toBe(0);
```

## Security Considerations

### JWT Token Security
- Tokens stored in AsyncStorage (encrypted on iOS)
- Never logged or exposed in client-side code
- Refreshed before expiration
- Revoked on logout

### Message Encryption
- End-to-end encryption planned for future release
- Currently TLS/SSL in transit
- No child PII allowed in messages (Constitution Principle I)

### Rate Limiting
- Server-side rate limiting on message sending
- Max 60 messages per minute per user
- Typing events limited to 1 per second

## Troubleshooting

### Connection Won't Establish
1. Check network connectivity
2. Verify auth token exists in AsyncStorage
3. Confirm server URL is correct
4. Check server health status

### Messages Not Delivering
1. Verify Socket.io connection established
2. Check retry queue size
3. Confirm recipient is valid match
4. Review server logs for errors

### Typing Indicators Not Working
1. Verify connection established
2. Check event listener registration
3. Confirm matchId is correct
4. Review debounce timeout settings

## Best Practices

### Component Lifecycle
```typescript
useEffect(() => {
  // Connect on mount
  socketService.connect();

  // Register listeners
  socketService.onMessageReceived(handleMessage);

  return () => {
    // Cleanup on unmount
    socketService.offMessageReceived(handleMessage);
    socketService.disconnect();
  };
}, []);
```

### Error Recovery
```typescript
// Always handle connection errors
socket.on('connect_error', (error) => {
  // User-friendly message
  showToast('Connection lost. Retrying...');

  // Log for debugging
  console.error('Socket error:', error);

  // Optional: Manual retry button
  setShowRetryButton(true);
});
```

### Resource Cleanup
```typescript
// Clear retry queue on logout
messagesAPI.clearRetryQueue();

// Disconnect socket on logout
socketService.disconnect();

// Clear message cache
queryClient.clear();
```

## Future Enhancements
- End-to-end encryption (Signal Protocol)
- Voice messages support
- Image/file sharing optimization
- Push notifications integration
- WebRTC video calls
- Message reactions and threading
