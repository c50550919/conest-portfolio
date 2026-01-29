# Messaging Integration - Quick Start Guide

## Quick Reference

### Import Statements
```typescript
// Messages API
import messagesAPI from '@/services/api/messages';

// Socket.io
import socketService from '@/services/socket';

// Types
import type { Message, Match, MessagesResponse } from '@/types/messages';
```

### API Usage

#### Fetch Matches
```typescript
const { matches, nextCursor } = await messagesAPI.getMatches();
```

#### Fetch Message History
```typescript
const { messages, nextCursor } = await messagesAPI.getHistory(matchId, cursor);
```

#### Send Message
```typescript
const { message } = await messagesAPI.sendMessage(matchId, 'Hello!');
```

#### Mark as Read
```typescript
await messagesAPI.markAsRead(messageId);
await messagesAPI.markConversationAsRead(matchId);
```

### Socket.io Usage

#### Connect/Disconnect
```typescript
// Connect
await socketService.connect();

// Disconnect
socketService.disconnect();

// Check connection
const isConnected = socketService.connected();
```

#### Listen for Messages
```typescript
socketService.onMessageReceived((data) => {
  console.log('New message:', data.content);
});
```

#### Typing Indicators
```typescript
// Listen
socketService.onTypingStart((data) => {
  setIsTyping(true);
});

socketService.onTypingStop((data) => {
  setIsTyping(false);
});

// Emit
socketService.emitTypingStart(matchId);
socketService.emitTypingStop(matchId);
```

#### Read Receipts
```typescript
socketService.onMessageRead((data) => {
  console.log('Message read:', data.messageId);
});
```

### React Query Integration

#### Fetch Matches
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['matches'],
  queryFn: () => messagesAPI.getMatches(),
  refetchInterval: 30000,
});
```

#### Fetch Messages
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['messages', matchId],
  queryFn: () => messagesAPI.getHistory(matchId),
  enabled: !!matchId,
});
```

#### Send Message Mutation
```typescript
const sendMutation = useMutation({
  mutationFn: ({ matchId, content }) =>
    messagesAPI.sendMessage(matchId, content),
  onSuccess: () => {
    queryClient.invalidateQueries(['messages', matchId]);
  },
});

// Use it
sendMutation.mutate({ matchId, content: 'Hello!' });
```

### Complete Component Example

```typescript
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import messagesAPI from '@/services/api/messages';
import socketService from '@/services/socket';
import type { Match, Message } from '@/types/messages';

const ChatComponent = ({ matchId }: { matchId: string }) => {
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', matchId],
    queryFn: () => messagesAPI.getHistory(matchId),
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      messagesAPI.sendMessage(matchId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', matchId]);
    },
  });

  // Socket.io setup
  useEffect(() => {
    socketService.connect();

    const handleMessage = (data: any) => {
      if (data.matchId === matchId) {
        queryClient.invalidateQueries(['messages', matchId]);
      }
    };

    const handleTypingStart = (data: any) => {
      if (data.matchId === matchId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.matchId === matchId) {
        setIsTyping(false);
      }
    };

    socketService.onMessageReceived(handleMessage);
    socketService.onTypingStart(handleTypingStart);
    socketService.onTypingStop(handleTypingStop);

    return () => {
      socketService.offMessageReceived(handleMessage);
      socketService.offTypingStart(handleTypingStart);
      socketService.offTypingStop(handleTypingStop);
    };
  }, [matchId, queryClient]);

  const handleSend = (text: string) => {
    sendMutation.mutate(text);
  };

  return (
    <View>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <MessageList messages={messagesData?.messages || []} />
      )}
      {isTyping && <TypingIndicator />}
      <MessageInput onSend={handleSend} />
    </View>
  );
};
```

## Files Created

1. `/mobile/src/services/api/messages.ts` - Messages API client
2. `/mobile/src/services/socket.ts` - Enhanced Socket.io service
3. `/mobile/src/types/messages.ts` - TypeScript types
4. `/mobile/src/screens/main/MessagesScreen.tsx` - Enhanced UI component
5. `/mobile/docs/socket-connection-handling.md` - Documentation
6. `/mobile/docs/messaging-integration-summary.md` - Summary

## Key Features

✅ Real-time message delivery via Socket.io
✅ Optimistic UI updates
✅ Typing indicators (3s debounce)
✅ Offline support with retry queue
✅ Unread count badges
✅ React Query caching
✅ Redux state management
✅ JWT authentication
✅ Error handling
✅ TypeScript type safety

## Backend Requirements

The mobile app is ready, but requires these backend endpoints:

### REST API Endpoints
- `GET /api/messages/matches` - List matches with latest message
- `GET /api/messages/history/:matchId` - Message history (paginated)
- `POST /api/messages/:matchId` - Send message
- `PATCH /api/messages/:messageId/read` - Mark as read

### Socket.io Events (Server → Client)
- `message.received` - New message delivery
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `message.read` - Read receipt
- `match.created` - Mutual match notification

### Socket.io Events (Client → Server)
- `typing:start` - Emit typing started
- `typing:stop` - Emit typing stopped

## Testing

### Unit Test Example
```typescript
import messagesAPI from '@/services/api/messages';

describe('MessagesAPI', () => {
  it('should fetch matches', async () => {
    const response = await messagesAPI.getMatches();
    expect(response.matches).toBeDefined();
    expect(Array.isArray(response.matches)).toBe(true);
  });

  it('should send message', async () => {
    const response = await messagesAPI.sendMessage('match-123', 'Hello!');
    expect(response.message.content).toBe('Hello!');
  });
});
```

### Integration Test Example
```typescript
import socketService from '@/services/socket';

describe('Socket.io Integration', () => {
  beforeAll(async () => {
    await socketService.connect();
  });

  afterAll(() => {
    socketService.disconnect();
  });

  it('should receive messages', (done) => {
    socketService.onMessageReceived((data) => {
      expect(data.messageId).toBeDefined();
      expect(data.content).toBeDefined();
      done();
    });
  });
});
```

## Troubleshooting

### Messages Not Sending
1. Check Socket.io connection: `socketService.connected()`
2. Verify auth token in AsyncStorage
3. Check network connectivity
4. Review retry queue size: `messagesAPI.getRetryQueueSize()`

### Typing Indicators Not Working
1. Verify Socket.io connected
2. Check matchId is correct
3. Review debounce timeout (3 seconds)
4. Ensure event listeners registered

### Performance Issues
1. Limit message history to 50 per request
2. Use FlatList virtualization
3. Implement infinite scroll with pagination
4. Cache messages with React Query

## Next Steps

1. Backend API implementation
2. Socket.io server setup
3. Database schema for messages
4. Push notifications integration
5. Image/file sharing support
