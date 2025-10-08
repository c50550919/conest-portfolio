/**
 * Messages Screen
 * Chat interface with GiftedChat for messaging matched parents
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Text,
} from 'react-native';
import { GiftedChat, IMessage, Send, Bubble } from 'react-native-gifted-chat';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';

// Mock conversation data
interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  profilePhoto?: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    lastMessage: 'That sounds great! When can we schedule a tour?',
    timestamp: '2 hours ago',
    unread: 2,
  },
  {
    id: '2',
    name: 'Maria Garcia',
    lastMessage: 'I usually work Mon-Fri 8-4, so evenings work best',
    timestamp: '5 hours ago',
    unread: 0,
  },
  {
    id: '3',
    name: 'Jennifer Chen',
    lastMessage: 'Thanks for the info about the neighborhood!',
    timestamp: 'Yesterday',
    unread: 0,
  },
];

const MessagesScreen: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([
    {
      _id: 1,
      text: 'Hello! I saw your profile and we seem to have similar schedules.',
      createdAt: new Date(Date.now() - 3600000),
      user: {
        _id: 2,
        name: 'Sarah Johnson',
      },
    },
    {
      _id: 2,
      text: 'Hi Sarah! Yes, I noticed that too. Would you like to chat about potentially sharing a place?',
      createdAt: new Date(Date.now() - 1800000),
      user: {
        _id: 1,
        name: 'You',
      },
    },
    {
      _id: 3,
      text: 'That sounds great! When can we schedule a tour?',
      createdAt: new Date(Date.now() - 600000),
      user: {
        _id: 2,
        name: 'Sarah Johnson',
      },
    },
  ]);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, newMessages),
    );
    // TODO: Send message to API via Socket.io
  }, []);

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => setSelectedConversation(item.id)}
    >
      <View style={styles.profilePhotoContainer}>
        <Icon name="account-circle" size={56} color={colors.text.secondary} />
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
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

  if (selectedConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedConversation(null)}
            testID="back-to-messages-button"
          >
            <Icon name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>
            {MOCK_CONVERSATIONS.find(c => c.id === selectedConversation)?.name}
          </Text>
          <TouchableOpacity style={styles.headerAction}>
            <Icon name="dots-vertical" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={{
            _id: 1,
            name: 'You',
          }}
          renderSend={renderSend}
          renderBubble={renderBubble}
          alwaysShowSend
          scrollToBottom
          placeholder="Type a message..."
          textInputProps={{
            testID: 'chat-input'
          }}
          timeTextStyle={{
            left: { color: colors.text.secondary },
            right: { color: '#FFFFFF' },
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      {MOCK_CONVERSATIONS.length > 0 ? (
        <FlatList
          data={MOCK_CONVERSATIONS}
          renderItem={renderConversationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.conversationList}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
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
