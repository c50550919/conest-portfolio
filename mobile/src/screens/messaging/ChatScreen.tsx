/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * ChatScreen
 * Real-time chat interface with message history
 * Displays messages, typing indicators, and verification status
 * Supports message reporting and conversation blocking
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  sendMessage,
  fetchMessages,
  fetchMessagesGated,
  markConversationAsRead,
  blockConversation as blockConversationAction,
  selectMessagesByConversation,
  selectMessagesLoading,
  selectMessagesSending,
  selectTypingUsers,
  selectLockedConversation,
  selectUserMessagesLocked,
  setTypingStatus,
  Message,
} from '../../store/slices/enhancedMessagesSlice';
import { selectIsFullyVerified } from '../../store/slices/verificationSlice';
import MessageBubble from '../../components/messaging/MessageBubble';
import MessageInput from '../../components/messaging/MessageInput';
import VerificationBadge from '../../components/messaging/VerificationBadge';
import ReportModal from '../../components/messaging/ReportModal';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { analytics, AnalyticsEvents } from '../../services/analytics';

interface RouteParams {
  conversationId: string;
  participantId: string;
  participantName: string;
  participantVerified: boolean;
}

type NavigationProp = NativeStackNavigationProp<any>;

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();

  const { conversationId, participantId, participantName, participantVerified } =
    route.params as RouteParams;

  const messages = useSelector((state: RootState) =>
    selectMessagesByConversation(state, conversationId)
  );
  const loading = useSelector((state: RootState) => selectMessagesLoading(state));
  const sending = useSelector((state: RootState) => selectMessagesSending(state));
  const typingUsers = useSelector((state: RootState) => selectTypingUsers(state));

  // Verification gating state
  const isFullyVerified = useSelector((state: RootState) => selectIsFullyVerified(state));
  const userMessagesLocked = useSelector((state: RootState) => selectUserMessagesLocked(state));
  const lockedConversation = useSelector((state: RootState) =>
    selectLockedConversation(state, conversationId)
  );

  // Derived state: Is this conversation locked for the current user?
  const isConversationLocked = !isFullyVerified && (userMessagesLocked || lockedConversation?.locked);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedMessageForReport, setSelectedMessageForReport] = useState<Message | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  const isParticipantTyping = typingUsers[participantId] || false;

  useEffect(() => {
    loadMessages();
    markAsRead();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    try {
      // Use gated endpoint to handle verification-locked conversations
      await dispatch(fetchMessagesGated(conversationId));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [dispatch, conversationId]);

  /**
   * Navigate to verification screen when user taps "Get Verified" CTA
   */
  const handleVerifyPress = useCallback(() => {
    navigation.navigate('Verification');
  }, [navigation]);

  const markAsRead = useCallback(async () => {
    try {
      await dispatch(markConversationAsRead(conversationId));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [dispatch, conversationId]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await dispatch(
          sendMessage({
            conversationId,
            recipientId: participantId,
            content,
          })
        );
        analytics.track(AnalyticsEvents.MESSAGE_SENT, { conversationId });

        // Scroll to bottom after sending
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      } catch (err: any) {
        if (err.requiresVerification) {
          Alert.alert(
            'Verification Required',
            err.message || 'You must complete verification to send messages.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Get Verified',
                onPress: () => navigation.navigate('Verification'),
              },
            ]
          );
        } else {
          Alert.alert('Error', err.message || 'Failed to send message');
        }
      }
    },
    [dispatch, conversationId, participantId, navigation]
  );

  const handleTypingStart = useCallback(() => {
    dispatch(
      setTypingStatus({
        conversationId,
        userId: currentUserId!,
        isTyping: true,
      })
    );
  }, [dispatch, conversationId, currentUserId]);

  const handleTypingStop = useCallback(() => {
    dispatch(
      setTypingStatus({
        conversationId,
        userId: currentUserId!,
        isTyping: false,
      })
    );
  }, [dispatch, conversationId, currentUserId]);

  const handleMessageLongPress = useCallback(
    (message: Message) => {
      if (message.senderId === currentUserId) {
        // Own message - show delete option
        Alert.alert('Message Options', 'What would you like to do?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              // TODO: Implement message deletion
              console.log('Delete message:', message.id);
            },
          },
        ]);
      } else {
        // Other's message - show report option
        Alert.alert('Message Options', 'What would you like to do?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            style: 'destructive',
            onPress: () => {
              setSelectedMessageForReport(message);
              setReportModalVisible(true);
            },
          },
        ]);
      }
    },
    [currentUserId],
  );

  const handleReportSubmit = useCallback(
    async (params: {
      messageId: string;
      reportType: string;
      severity: string;
      description: string;
    }) => {
      try {
        // TODO: Implement report submission through Redux
        console.log('Report submitted:', params);
        Alert.alert('Report Submitted', 'Thank you for reporting this message.');
        setReportModalVisible(false);
        setSelectedMessageForReport(null);
      } catch (err) {
        Alert.alert('Error', 'Failed to submit report');
      }
    },
    []
  );

  const handleBlockConversation = useCallback(async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${participantName}? You will no longer receive messages from them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(blockConversationAction(conversationId));
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to block conversation');
            }
          },
        },
      ]
    );
  }, [dispatch, conversationId, participantName, navigation]);

  const handleMenuPress = useCallback(() => {
    Alert.alert('Conversation Options', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'View Profile',
        onPress: () => {
          navigation.navigate('ProfileDetails', { userId: participantId });
        },
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: handleBlockConversation,
      },
    ]);
  }, [participantId, navigation, handleBlockConversation]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === currentUserId;

    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        onLongPress={handleMessageLongPress}
      />
    );
  };

  const renderTypingIndicator = () => {
    if (!isParticipantTyping) {
      return null;
    }

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, styles.typingDotDelay1]} />
          <View style={[styles.typingDot, styles.typingDotDelay2]} />
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerContent}
        onPress={() => navigation.navigate('ProfileDetails', { userId: participantId })}
      >
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName} numberOfLines={1}>
              {participantName}
            </Text>
            {participantVerified && (
              <VerificationBadge isVerified={participantVerified} size="small" variant="compact" />
            )}
          </View>
          {isParticipantTyping && <Text style={styles.headerStatus}>typing...</Text>}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
        <Icon name="dots-vertical" size={24} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );

  /**
   * Locked conversation UI for unverified users
   * Shows message count and verification CTA
   */
  const renderLockedState = () => (
    <View style={styles.lockedContainer}>
      <View style={styles.lockedIconWrapper}>
        <Icon name="lock" size={48} color={colors.warning} />
      </View>
      <Text style={styles.lockedTitle}>
        {lockedConversation?.unreadCount || 0} message
        {(lockedConversation?.unreadCount || 0) !== 1 ? 's' : ''} waiting
      </Text>
      <Text style={styles.lockedMessage}>
        Complete verification to view and reply to messages from {participantName}
      </Text>
      <TouchableOpacity
        style={styles.lockedVerifyButton}
        onPress={handleVerifyPress}
        activeOpacity={0.8}
      >
        <Icon name="shield-check" size={20} color="#FFFFFF" />
        <Text style={styles.lockedVerifyButtonText}>Get Verified Now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="message-outline" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyTitle}>Start the Conversation</Text>
      <Text style={styles.emptyMessage}>Send a message to {participantName} to get started!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {renderHeader()}

        {/* Show locked state for unverified users */}
        {isConversationLocked ? (
          renderLockedState()
        ) : loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty,
            ]}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderTypingIndicator}
            inverted
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
            }
          />
        )}

        {/* Block message input for unverified users */}
        {isConversationLocked ? (
          <View style={styles.lockedInputContainer}>
            <Icon name="lock" size={18} color={colors.text.secondary} />
            <Text style={styles.lockedInputText}>Verify to send messages</Text>
          </View>
        ) : (
          <MessageInput
            onSend={handleSendMessage}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            sending={sending}
          />
        )}

        {selectedMessageForReport && (
          <ReportModal
            visible={reportModalVisible}
            messageId={selectedMessageForReport.id}
            messageContent={selectedMessageForReport.content}
            onClose={() => {
              setReportModalVisible(false);
              setSelectedMessageForReport(null);
            }}
            onSubmit={handleReportSubmit}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  headerStatus: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: spacing.sm,
  },
  messagesListEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    transform: [{ scaleY: -1 }], // Flip back since FlatList is inverted
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
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    transform: [{ scaleY: -1 }], // Flip back since FlatList is inverted
  },
  typingBubble: {
    backgroundColor: colors.surface,
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.secondary,
    opacity: 0.4,
  },
  typingDotDelay1: {
    opacity: 0.6,
  },
  typingDotDelay2: {
    opacity: 0.8,
  },
  // Locked Conversation Styles
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  lockedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  lockedTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  lockedMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  lockedVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  lockedVerifyButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  lockedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceVariant,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  lockedInputText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
});

export default ChatScreen;
