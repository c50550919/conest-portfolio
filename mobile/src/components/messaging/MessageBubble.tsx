/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * MessageBubble Component
 * Displays individual message with read receipts, timestamps, and status indicators
 * Supports both sent and received messages with different styling
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Message } from '../../store/slices/enhancedMessagesSlice';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showTimestamp?: boolean;
  onLongPress?: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showTimestamp = false,
  onLongPress,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const getStatusIcon = () => {
    if (!isOwnMessage) {
      return null;
    }

    if (message.read) {
      return <Icon name="check-all" size={16} color={colors.primary} style={styles.statusIcon} />;
    }

    return <Icon name="check" size={16} color={colors.text.secondary} style={styles.statusIcon} />;
  };

  const getModerationIndicator = () => {
    if (!message.moderationStatus || message.moderationStatus === 'auto_approved') {
      return null;
    }

    if (message.moderationStatus === 'pending') {
      return (
        <View style={styles.moderationBadge}>
          <Icon name="clock-outline" size={12} color={colors.warning} />
          <Text style={styles.moderationText}>Under Review</Text>
        </View>
      );
    }

    if (message.moderationStatus === 'rejected') {
      return (
        <View style={[styles.moderationBadge, styles.moderationBadgeError]}>
          <Icon name="alert-circle" size={12} color={colors.error} />
          <Text style={[styles.moderationText, styles.moderationTextError]}>Removed</Text>
        </View>
      );
    }

    return null;
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(message);
    }
  };

  const bubbleStyle = isOwnMessage ? styles.sentBubble : styles.receivedBubble;
  const textStyle = isOwnMessage ? styles.sentText : styles.receivedText;
  const containerStyle = isOwnMessage ? styles.sentContainer : styles.receivedContainer;

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.7}
        style={bubbleStyle}
      >
        {message.flaggedForReview && (
          <View style={styles.flaggedIndicator}>
            <Icon name="flag" size={12} color={colors.warning} />
          </View>
        )}

        <Text style={textStyle}>{message.content}</Text>

        {message.fileUrl && message.messageType === 'image' && (
          <View style={styles.imagePlaceholder}>
            <Icon name="image" size={24} color={colors.text.secondary} />
            <Text style={styles.imagePlaceholderText}>Image</Text>
          </View>
        )}

        {message.fileUrl && message.messageType === 'file' && (
          <View style={styles.filePlaceholder}>
            <Icon name="file-document" size={20} color={colors.text.secondary} />
            <Text style={styles.filePlaceholderText}>File Attachment</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.timestamp, isOwnMessage && styles.sentTimestamp]}>
            {formatTime(message.sentAt)}
          </Text>
          {getStatusIcon()}
        </View>

        {getModerationIndicator()}
      </TouchableOpacity>

      {showTimestamp && (
        <Text style={styles.externalTimestamp}>{new Date(message.sentAt).toLocaleString()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  sentBubble: {
    backgroundColor: colors.primary,
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: colors.surface,
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sentText: {
    ...typography.body1,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  receivedText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  timestamp: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusIcon: {
    marginLeft: spacing.xs,
  },
  externalTimestamp: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 10,
    marginTop: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  flaggedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moderationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  moderationBadgeError: {
    backgroundColor: colors.error + '20',
  },
  moderationText: {
    ...typography.caption,
    color: colors.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  moderationTextError: {
    color: colors.error,
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  imagePlaceholderText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  filePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  filePlaceholderText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});

export default MessageBubble;
