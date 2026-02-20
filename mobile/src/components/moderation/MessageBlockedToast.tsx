/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Message Blocked Toast
 *
 * Shows a toast notification when a user's message is blocked by
 * the AI moderation system. Provides feedback without exposing
 * specific detection details.
 *
 * Constitution: Principle I (Child Safety)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  clearMessageBlocked,
  selectLastMessageBlocked,
} from '../../store/slices/moderationSlice';

const { width } = Dimensions.get('window');
const TOAST_DURATION = 5000;

export const MessageBlockedToast: React.FC = () => {
  const dispatch = useDispatch();
  const { blocked, reason } = useSelector(selectLastMessageBlocked);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (blocked) {
      // Show toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, TOAST_DURATION);

      return () => clearTimeout(timer);
    }
  }, [blocked]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dispatch(clearMessageBlocked());
    });
  };

  if (!blocked) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="message-alert" size={24} color={colors.error} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Message Not Sent</Text>
          <Text style={styles.message}>
            Your message couldn't be sent as it may not align with our community
            guidelines. Please review your message and try again.
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
          <Icon name="close" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Learn More Link */}
      <TouchableOpacity style={styles.learnMore}>
        <Text style={styles.learnMoreText}>View Community Guidelines</Text>
        <Icon name="chevron-right" size={16} color={colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.subtitle1,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  closeButton: {
    padding: spacing.xs,
  },
  learnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  learnMoreText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default MessageBlockedToast;
