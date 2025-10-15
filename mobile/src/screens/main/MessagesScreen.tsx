/**
 * Messages Screen
 * Chat interface with GiftedChat for messaging matched parents
 *
 * Constitution: Principle I (Child Safety - NO child PII in messages)
 *              Principle IV (Performance - real-time updates, optimistic UI)
 *
 * Features:
 * - Real-time message delivery via Socket.io
 * - Optimistic UI updates for sent messages
 * - Typing indicators with 3s debounce
 * - Offline support with retry queue
 * - Unread count badges
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { GiftedChat, IMessage, Send, Bubble } from 'react-native-gifted-chat';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { colors, spacing, typography } from '../../theme';
import messagesAPI, { Match, Message as APIMessage } from '../../services/api/messages';
import socketService from '../../services/socket';
import { addMessage as addMessageToStore } from '../../store/slices/messagesSlice';

// Helper function to convert API message to GiftedChat format
const apiMessageToGiftedChat = (msg: APIMessage, currentUserId: string): IMessage => ({
  _id: msg.id,
  text: msg.content,
  createdAt: new Date(msg.createdAt),
  user: {
    _id: msg.senderId,
  },
  sent: msg.status === 'sent',
  pending: msg.status === 'sending',
});

// Helper function to format timestamp
const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const MessagesScreen: React.FC = () => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('1'); // TODO: Get from auth state
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  // Fetch match list
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => messagesAPI.getMatches(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch message history for selected match
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedMatch?.id],
    queryFn: () => messagesAPI.getHistory(selectedMatch!.id),
    enabled: !!selectedMatch,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ matchId, content }: { matchId: string; content: string }) =>
      messagesAPI.sendMessage(matchId, content),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  // Connect to Socket.io on mount
  useEffect(() => {
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Setup Socket.io event listeners for selected match
  useEffect(() => {
    if (!selectedMatch) return;

    // Handle incoming messages
    const handleMessageReceived = (data: any) => {
      if (data.matchId === selectedMatch.id) {
        const newMessage = apiMessageToGiftedChat(
          {
            id: data.messageId,
            matchId: data.matchId,
            senderId: data.senderId,
            content: data.content,
            messageType: data.messageType,
            createdAt: data.timestamp,
            status: 'sent',
          },
          currentUserId
        );

        setMessages((prev) => GiftedChat.append(prev, [newMessage]));
        dispatch(addMessageToStore({
          id: data.messageId,
          conversationId: data.matchId,
          senderId: data.senderId,
          text: data.content,
          timestamp: data.timestamp,
          read: false,
        }));
      }
    };

    // Handle typing indicators
    const handleTypingStart = (data: any) => {
      if (data.matchId === selectedMatch.id && data.userId !== currentUserId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.matchId === selectedMatch.id) {
        setIsTyping(false);
      }
    };

    // Handle read receipts
    const handleMessageRead = (data: any) => {
      if (data.matchId === selectedMatch.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, received: true } : msg
          )
        );
      }
    };

    // Register listeners
    socketService.onMessageReceived(handleMessageReceived);
    socketService.onTypingStart(handleTypingStart);
    socketService.onTypingStop(handleTypingStop);
    socketService.onMessageRead(handleMessageRead);

    // Cleanup listeners
    return () => {
      socketService.offMessageReceived(handleMessageReceived);
      socketService.offTypingStart(handleTypingStart);
      socketService.offTypingStop(handleTypingStop);
      socketService.offMessageRead(handleMessageRead);
    };
  }, [selectedMatch, currentUserId, dispatch]);

  // Convert API messages to GiftedChat format when data loads
  useEffect(() => {
    if (messagesData?.messages) {
      const giftedMessages = messagesData.messages.map((msg) =>
        apiMessageToGiftedChat(msg, currentUserId)
      );
      setMessages(giftedMessages);
    }
  }, [messagesData, currentUserId]);

  // Handle sending messages
  const onSend = useCallback(
    (newMessages: IMessage[] = []) => {
      if (!selectedMatch || newMessages.length === 0) return;

      const message = newMessages[0];

      // Optimistic UI update
      setMessages((prev) => GiftedChat.append(prev, newMessages));

      // Send to API
      sendMessageMutation.mutate({
        matchId: selectedMatch.id,
        content: message.text,
      });
    },
    [selectedMatch, sendMessageMutation]
  );

  // Handle typing indicator with debounce
  const handleInputTextChanged = useCallback(
    (text: string) => {
      if (!selectedMatch) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Emit typing start
      if (text.length > 0) {
        socketService.emitTypingStart(selectedMatch.id);

        // Set timeout to emit typing stop after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
          socketService.emitTypingStop(selectedMatch.id);
        }, 3000);
      } else {
        socketService.emitTypingStop(selectedMatch.id);
      }
    },
    [selectedMatch]
  );

  const renderMatchItem = ({ item, index }: { item: Match; index: number }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => setSelectedMatch(item)}
      testID={`conversation-item-${index}`}
    >
      <View style={styles.profilePhotoContainer}>
        {item.profilePhoto ? (
          <Icon name="account-circle" size={56} color={colors.text.secondary} />
        ) : (
          <Icon name="account-circle" size={56} color={colors.text.secondary} />
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} testID={`conversation-name-${index}`}>
            {item.firstName}
          </Text>
          <Text style={styles.timestamp}>
            {item.lastMessage ? formatTimestamp(item.lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1} testID={`conversation-preview-${index}`}>
            {item.lastMessage?.content || 'Start a conversation'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSend = (props: any) => (
    <Send {...props}>
      <View style={styles.sendButton}>
        <Icon name="send" size={24} color={colors.primary} />
      </View>
    </Send>
  );

  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: colors.primary,
        },
        left: {
          backgroundColor: colors.surface,
        },
      }}
      textStyle={{
        right: {
          color: '#FFFFFF',
        },
        left: {
          color: colors.text.primary,
        },
      }}
    />
  );

  // Chat view
  if (selectedMatch) {
    if (messagesLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedMatch(null)}
              testID="back-to-messages-button"
            >
              <Icon name="arrow-left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitle}>{selectedMatch.firstName}</Text>
            <TouchableOpacity style={styles.headerAction}>
              <Icon name="dots-vertical" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedMatch(null)}
            testID="back-to-messages-button"
          >
            <Icon name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>{selectedMatch.firstName}</Text>
          <TouchableOpacity style={styles.headerAction}>
            <Icon name="dots-vertical" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <GiftedChat
          messages={messages}
          onSend={(msgs) => onSend(msgs)}
          onInputTextChanged={handleInputTextChanged}
          user={{
            _id: currentUserId,
            name: 'You',
          }}
          renderSend={renderSend}
          renderBubble={renderBubble}
          alwaysShowSend
          scrollToBottom
          placeholder="Type a message..."
          isTyping={isTyping}
          textInputProps={{
            testID: 'chat-input',
          }}
          timeTextStyle={{
            left: { color: colors.text.secondary },
            right: { color: '#FFFFFF' },
          }}
        />
      </SafeAreaView>
    );
  }

  // Match list view
  if (matchesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const matches = matchesData?.matches || [];
  const totalUnreadCount = matches.reduce((sum, match) => sum + match.unreadCount, 0);

  return (
    <SafeAreaView style={styles.container} testID="messages-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {totalUnreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnreadCount}</Text>
          </View>
        )}
      </View>
      {matches.length > 0 ? (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationList}
          testID="conversation-list"
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="chat-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start matching with parents to begin conversations!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationList: {
    paddingTop: spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profilePhotoContainer: {
    marginRight: spacing.md,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  conversationName: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  timestamp: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  chatHeaderTitle: {
    ...typography.h4,
    color: colors.text.primary,
    flex: 1,
  },
  headerAction: {
    padding: spacing.sm,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
});

export default MessagesScreen;
