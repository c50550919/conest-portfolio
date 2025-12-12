/**
 * ConversationsListScreen
 * Displays all messaging conversations with verification badges
 * Shows unread counts, last message previews, and verification status
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  fetchConversations,
  selectConversations,
  selectConversationsLoading,
  selectConversationsError,
} from '../../store/slices/enhancedMessagesSlice';
import VerificationBadge from '../../components/messaging/VerificationBadge';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantVerified: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isMuted: boolean;
  isBlocked: boolean;
}

type NavigationProp = NativeStackNavigationProp<any>;

const ConversationsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const conversations = useSelector((state: RootState) => selectConversations(state));
  const loading = useSelector((state: RootState) => selectConversationsLoading(state));
  const error = useSelector((state: RootState) => selectConversationsError(state));

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      await dispatch(fetchConversations()).unwrap();
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      if (conversation.isBlocked) {
        // Show blocked message
        return;
      }

      navigation.navigate('Chat', {
        conversationId: conversation.id,
        participantId: conversation.participantId,
        participantName: conversation.participantName,
        participantVerified: conversation.participantVerified,
      });
    },
    [navigation]
  );

  const formatTimestamp = (dateString?: string): string => {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationCard,
        item.unreadCount > 0 && styles.conversationCardUnread,
        item.isBlocked && styles.conversationCardBlocked,
      ]}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Icon name="account" size={32} color={colors.text.secondary} />
        </View>
        {item.participantVerified && (
          <View style={styles.verificationBadgeContainer}>
            <VerificationBadge
              isVerified={item.participantVerified}
              size="small"
              variant="compact"
            />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.participantName, item.unreadCount > 0 && styles.participantNameUnread]}
            numberOfLines={1}
          >
            {item.participantName}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.lastMessageAt)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text
            style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.isMuted && <Icon name="volume-off" size={14} color={colors.text.secondary} />}{' '}
            {item.isBlocked ? 'Conversation blocked' : item.lastMessage || 'No messages yet'}
          </Text>

          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="message-text-outline" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyTitle}>No Conversations</Text>
      <Text style={styles.emptyMessage}>
        Start matching with other verified parents to begin messaging!
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={styles.emptyTitle}>Failed to Load</Text>
      <Text style={styles.emptyMessage}>{error || 'Something went wrong'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="magnify" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && conversations.length === 0 ? (
        renderErrorState()
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  headerButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  listContentEmpty: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  conversationCardUnread: {
    backgroundColor: colors.primary + '05',
  },
  conversationCardBlocked: {
    opacity: 0.6,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationBadgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  participantName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  participantNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
    marginLeft: spacing.sm,
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
  },
  lastMessageUnread: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  unreadCount: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ConversationsListScreen;
