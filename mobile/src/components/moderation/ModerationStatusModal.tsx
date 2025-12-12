/**
 * Moderation Status Modal
 *
 * Full-screen modal that displays when user receives a moderation action
 * (warning, suspension, or ban). Requires acknowledgment before continuing.
 *
 * Constitution: Principle I (Child Safety)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  setShowStatusModal,
  selectModerationStatus,
  selectSuspensionInfo,
  ModerationStatus,
  ModerationState,
} from '../../store/slices/moderationSlice';

interface StatusContent {
  icon: string;
  iconColor: string;
  title: string;
  message: string;
  buttonText: string;
  showLogout: boolean;
}

const STATUS_CONTENT: Record<ModerationStatus, StatusContent> = {
  good_standing: {
    icon: 'check-circle',
    iconColor: colors.success,
    title: 'All Clear',
    message: 'Your account is in good standing.',
    buttonText: 'Continue',
    showLogout: false,
  },
  warned: {
    icon: 'alert-circle',
    iconColor: colors.warning,
    title: 'Account Warning',
    message:
      'Your account has received a warning for messaging patterns that may not align with our community guidelines focused on child safety.\n\nThis is a formal reminder to review our community guidelines and ensure your communications focus on housing compatibility.\n\nContinued violations may result in account suspension.',
    buttonText: 'I Understand',
    showLogout: false,
  },
  suspended: {
    icon: 'clock-alert',
    iconColor: colors.error,
    title: 'Account Suspended',
    message:
      'Your account has been temporarily suspended due to community guideline concerns.\n\nDuring this time:\n• You cannot send messages\n• You cannot use matching features\n• Your profile is hidden from other users\n\nYour account will be automatically restored after the suspension period.',
    buttonText: 'I Understand',
    showLogout: false,
  },
  banned: {
    icon: 'account-off',
    iconColor: colors.errorDark,
    title: 'Account Deactivated',
    message:
      'Your account has been permanently deactivated due to confirmed violations of our community safety guidelines.\n\nCoNest has a zero-tolerance policy for behavior that poses potential risks to children or families.\n\nIf you believe this action was taken in error, you may submit a formal appeal to safety@conest.com within 30 days.',
    buttonText: 'Sign Out',
    showLogout: true,
  },
};

interface ModerationStatusModalProps {
  onLogout?: () => void;
}

export const ModerationStatusModal: React.FC<ModerationStatusModalProps> = ({
  onLogout,
}) => {
  const dispatch = useDispatch();
  const status = useSelector(selectModerationStatus);
  const suspensionInfo = useSelector(selectSuspensionInfo);
  const showModal = useSelector(
    (state: { moderation: ModerationState }) => state.moderation.showStatusModal
  );

  const content = STATUS_CONTENT[status];

  const handleDismiss = () => {
    if (content.showLogout && onLogout) {
      onLogout();
    } else {
      dispatch(setShowStatusModal(false));
    }
  };

  const formatSuspensionTime = () => {
    if (!suspensionInfo.until) return null;

    const until = new Date(suspensionInfo.until);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
    return until.toLocaleDateString('en-US', options);
  };

  // Don't show modal for good standing
  if (!showModal || status === 'good_standing') {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: content.iconColor + '15' },
            ]}
          >
            <Icon name={content.icon} size={64} color={content.iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: content.iconColor }]}>
            {content.title}
          </Text>

          {/* Message */}
          <Text style={styles.message}>{content.message}</Text>

          {/* Suspension End Time */}
          {status === 'suspended' && suspensionInfo.until && (
            <View style={styles.suspensionInfo}>
              <Icon name="calendar-clock" size={20} color={colors.text.secondary} />
              <Text style={styles.suspensionText}>
                Access will be restored on:{'\n'}
                <Text style={styles.suspensionDate}>{formatSuspensionTime()}</Text>
              </Text>
            </View>
          )}

          {/* Reason (if provided) */}
          {suspensionInfo.reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason for this action:</Text>
              <Text style={styles.reasonText}>{suspensionInfo.reason}</Text>
            </View>
          )}

          {/* Guidelines Reminder */}
          {status !== 'banned' && (
            <View style={styles.guidelinesBox}>
              <Icon name="shield-check" size={24} color={colors.primary} />
              <Text style={styles.guidelinesText}>
                CoNest is committed to providing a safe environment for all
                families. Our guidelines exist to protect everyone in our
                community.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              content.showLogout && styles.buttonDanger,
            ]}
            onPress={handleDismiss}
          >
            <Text
              style={[
                styles.buttonText,
                content.showLogout && styles.buttonTextDanger,
              ]}
            >
              {content.buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  suspensionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    width: '100%',
  },
  suspensionText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  suspensionDate: {
    ...typography.subtitle1,
    color: colors.text.primary,
  },
  reasonBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    width: '100%',
  },
  reasonLabel: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.body1,
    color: colors.text.primary,
  },
  guidelinesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight + '30',
    padding: spacing.md,
    borderRadius: 12,
    width: '100%',
  },
  guidelinesText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonText: {
    ...typography.button,
    color: colors.surface,
    fontSize: 16,
  },
  buttonTextDanger: {
    color: colors.surface,
  },
});

export default ModerationStatusModal;
