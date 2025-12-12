# Messaging System Integration Guide

## Overview
This guide explains how to integrate the enhanced messaging system into the CoNest mobile app.

## Files Created

### Components
- `src/components/messaging/VerificationBadge.tsx` - Verification status indicator
- `src/components/messaging/MessageBubble.tsx` - Individual message display
- `src/components/messaging/MessageInput.tsx` - Message composition input
- `src/components/messaging/ReportModal.tsx` - Message reporting modal

### Screens
- `src/screens/messaging/ConversationsListScreen.tsx` - All conversations list
- `src/screens/messaging/ChatScreen.tsx` - Individual chat interface

### Services
- `src/services/api/enhancedMessagesAPI.ts` - API client for messaging
- `src/services/messaging/socketIntegration.ts` - Real-time Socket.io integration

### State Management
- `src/store/slices/enhancedMessagesSlice.ts` - Redux slice for messaging state

## Integration Steps

### 1. Initialize Socket Integration

Add to your app's initialization (e.g., `App.tsx` or after login):

```typescript
import { initializeMessagingSocket, cleanupMessagingSocket } from './services/messaging/socketIntegration';
import socketService from './services/socket';

// After successful login
const handleLoginSuccess = async () => {
  // Connect socket service
  await socketService.connect();

  // Initialize messaging socket integration
  initializeMessagingSocket();
};

// On logout
const handleLogout = async () => {
  // Cleanup messaging socket integration
  cleanupMessagingSocket();

  // Disconnect socket service
  socketService.disconnect();
};
```

### 2. Add Navigation Routes

Add messaging screens to your navigation stack:

```typescript
// In your navigation configuration (e.g., MainNavigator.tsx)
import ConversationsListScreen from '../screens/messaging/ConversationsListScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

const Stack = createNativeStackNavigator();

const MessagingNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ConversationsList"
      component={ConversationsListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Chat"
      component={ChatScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);
```

### 3. Add Navigation Link from Home Screen

Add a messaging icon to your home screen or tab bar:

```typescript
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ConversationsList')}
    >
      <Icon name="message-text" size={24} color={colors.primary} />
      {/* Optional unread badge */}
    </TouchableOpacity>
  );
};
```

### 4. Handle Push Notifications (Optional)

When user receives a message notification:

```typescript
import { joinConversation } from './services/messaging/socketIntegration';

const handleMessageNotification = (notification: any) => {
  const { conversationId, participantId, participantName, participantVerified } = notification.data;

  // Navigate to chat screen
  navigation.navigate('Chat', {
    conversationId,
    participantId,
    participantName,
    participantVerified,
  });

  // Join conversation for real-time updates
  joinConversation(conversationId);
};
```

### 5. Update Redux Store Configuration

Ensure the enhancedMessages slice is registered in your store:

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import enhancedMessagesReducer from './slices/enhancedMessagesSlice';

export const store = configureStore({
  reducer: {
    // ... other reducers
    enhancedMessages: enhancedMessagesReducer,
  },
});
```

## Usage Examples

### Displaying Verification Badge

```typescript
import VerificationBadge from '../components/messaging/VerificationBadge';

<VerificationBadge
  isVerified={user.isVerified}
  size="medium"
  showLabel
  variant="full"
/>
```

### Using Message Components Standalone

```typescript
import MessageBubble from '../components/messaging/MessageBubble';

<MessageBubble
  message={{
    id: '123',
    content: 'Hello!',
    sentAt: new Date().toISOString(),
    read: false,
    delivered: true,
    // ... other fields
  }}
  isOwnMessage={true}
  onLongPress={(message) => console.log('Long press:', message)}
/>
```

### Message Input with Typing Indicators

```typescript
import MessageInput from '../components/messaging/MessageInput';
import { emitTypingStart, emitTypingStop } from '../services/messaging/socketIntegration';

<MessageInput
  onSend={(content) => handleSendMessage(content)}
  onTypingStart={() => emitTypingStart(conversationId)}
  onTypingStop={() => emitTypingStop(conversationId)}
  sending={sending}
  placeholder="Type a message..."
/>
```

### Reporting a Message

```typescript
import ReportModal from '../components/messaging/ReportModal';
import { reportMessage } from '../store/slices/enhancedMessagesSlice';

const [reportModalVisible, setReportModalVisible] = useState(false);
const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

<ReportModal
  visible={reportModalVisible}
  messageId={selectedMessage?.id}
  messageContent={selectedMessage?.content}
  onClose={() => setReportModalVisible(false)}
  onSubmit={async (params) => {
    await dispatch(reportMessage(params)).unwrap();
    Alert.alert('Success', 'Report submitted');
  }}
/>
```

## Environment Variables

Ensure these are set in your `.env` file:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api

# Socket.IO Configuration
SOCKET_URL=http://localhost:3000
```

## Socket Events Reference

### Events Listened To
- `message:new` - New message received
- `message:delivered` - Message delivered to recipient
- `message:read` - Message read by recipient
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline
- `conversation:updated` - Conversation settings updated
- `user:verified` - User verification status changed

### Events Emitted
- `typing:start` - Notify when starting to type
- `typing:stop` - Notify when stopped typing
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room

## Redux Actions Available

### Async Thunks
- `sendMessage(params)` - Send a new message
- `fetchMessages(conversationId)` - Load message history
- `fetchConversations()` - Load all conversations
- `markConversationAsRead(conversationId)` - Mark as read
- `markMessageAsRead(messageId)` - Mark single message as read
- `reportMessage(params)` - Report a message
- `blockConversation(conversationId)` - Block a conversation

### Sync Actions
- `messageReceived(message)` - Add received message to state
- `messageDelivered(params)` - Update message delivered status
- `messageRead(params)` - Update message read status
- `setTypingStatus(params)` - Update typing indicators
- `setOnlineStatus(params)` - Update online status
- `updateConversation(params)` - Update conversation settings

## Selectors Available

```typescript
import {
  selectConversations,
  selectConversationsLoading,
  selectMessagesByConversation,
  selectMessagesLoading,
  selectMessagesSending,
  selectTypingUsers,
  selectOnlineUsers,
} from '../store/slices/enhancedMessagesSlice';

// In component
const conversations = useAppSelector(selectConversations);
const messages = useAppSelector((state) =>
  selectMessagesByConversation(state, conversationId)
);
const isTyping = useAppSelector(selectTypingUsers)[userId];
const isOnline = useAppSelector(selectOnlineUsers)[userId];
```

## Testing the Integration

### Manual Testing Steps

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Mobile App**
   ```bash
   cd mobile
   npm run ios  # or npm run android
   ```

3. **Test Conversation List**
   - Navigate to conversations screen
   - Verify conversations load
   - Check unread badges
   - Test pull-to-refresh

4. **Test Chat Screen**
   - Open a conversation
   - Send a test message
   - Verify message appears
   - Test typing indicators
   - Try long-press on messages
   - Test report modal
   - Test block conversation

5. **Test Real-time Features**
   - Open same conversation on two devices
   - Send message from one device
   - Verify it appears on other device
   - Test typing indicators between devices
   - Test read receipts

## Troubleshooting

### Messages not appearing
- Check Socket.io connection: `socketService.connected()`
- Verify you called `initializeMessagingSocket()`
- Check browser/debugger console for socket errors

### Typing indicators not working
- Ensure `joinConversation(conversationId)` was called
- Check that typing events are being emitted
- Verify socket connection is active

### Redux state not updating
- Check that Redux store includes enhancedMessages reducer
- Verify actions are being dispatched correctly
- Use Redux DevTools to inspect state changes

### Navigation not working
- Ensure screens are registered in navigation stack
- Check route names match exactly
- Verify navigation params are passed correctly

## Next Steps

1. **Add Deep Linking** - Link to specific conversations from notifications
2. **Implement Offline Queue** - Store messages when offline, send when reconnected
3. **Add Message Search** - Search within conversations
4. **Add File Attachments** - Support for image/file uploads
5. **Add Message Reactions** - Like/react to messages
6. **Add Voice Messages** - Record and send audio

## Support

For issues or questions:
1. Check [MESSAGING_COMPLETION_STATUS.md](../MESSAGING_COMPLETION_STATUS.md)
2. Review [MESSAGING_IMPLEMENTATION.md](../MESSAGING_IMPLEMENTATION.md)
3. Check code comments in implementation files
4. Review Redux DevTools for state issues
5. Check Socket.io connection in debugger
