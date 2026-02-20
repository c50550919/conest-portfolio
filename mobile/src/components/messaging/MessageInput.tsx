/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * MessageInput Component
 * Text input for composing and sending messages
 * Emits typing indicators and handles message submission
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  sending?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  placeholder = 'Type a message...',
  maxLength = 1000,
  disabled = false,
  autoFocus = false,
  sending = false,
}) => {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTextChange = (text: string) => {
    setContent(text);

    // Emit typing start if not already typing
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      onTypingStart?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to emit typing stop after 2 seconds of inactivity
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTypingStop?.();
      }, 2000);
    } else {
      // Immediately stop typing if text is empty
      setIsTyping(false);
      onTypingStop?.();
    }
  };

  const handleSend = () => {
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0 || disabled || sending) {
      return;
    }

    // Clear typing timeout and emit typing stop
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTypingStop?.();

    // Send message
    onSend(trimmedContent);

    // Clear input
    setContent('');

    // Refocus input for next message
    inputRef.current?.focus();
  };

  const canSend = content.trim().length > 0 && !disabled && !sending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={content}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.text.secondary}
            multiline
            maxLength={maxLength}
            editable={!disabled && !sending}
            autoFocus={autoFocus}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              canSend && styles.sendButtonActive,
              (!canSend || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={20} color={canSend ? '#FFFFFF' : colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View>

        {content.length > maxLength * 0.9 && (
          <View style={styles.characterCount}>
            <Icon
              name={content.length >= maxLength ? 'alert-circle' : 'information'}
              size={12}
              color={content.length >= maxLength ? colors.error : colors.text.secondary}
              style={styles.characterCountIcon}
            />
            <Text style={styles.characterCountText}>
              {content.length} / {maxLength}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body1,
    color: colors.text.primary,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.text.secondary,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  characterCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  characterCountIcon: {
    marginRight: spacing.xs,
  },
  characterCountText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.secondary,
  },
});

export default MessageInput;
