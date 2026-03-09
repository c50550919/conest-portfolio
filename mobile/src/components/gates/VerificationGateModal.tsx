/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Verification Gate Modal Component
 *
 * Modal that blocks actions requiring verification (phone, ID, background check).
 * Explains the requirement and provides a path to complete verification.
 *
 * - phone: Inline OTP input for phone verification
 * - id: Link to ID verification flow
 * - background: Link to background check flow
 *
 * Constitution: Principle I (Child Safety), Principle III (Security)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

export type GateType = 'phone' | 'id' | 'background';

interface VerificationGateModalProps {
  visible: boolean;
  gateType: GateType;
  onVerify: () => void;
  onDismiss: () => void;
}

const GATE_CONFIG: Record<GateType, {
  title: string;
  description: string;
  buttonText: string;
  timeEstimate: string;
}> = {
  phone: {
    title: 'Verify your phone to send messages',
    description: 'Phone verification ensures real people are connecting. A quick SMS code is all it takes.',
    buttonText: 'Verify Phone',
    timeEstimate: '~30 seconds',
  },
  id: {
    title: 'Verify your identity to connect',
    description: 'Identity verification helps keep our community safe for families. Upload a government-issued ID.',
    buttonText: 'Verify Identity',
    timeEstimate: '~2 minutes',
  },
  background: {
    title: 'Complete a background check to join households',
    description: 'Background checks are required before sharing a home. This keeps our community safe for everyone.',
    buttonText: 'Start Background Check',
    timeEstimate: '~5 minutes',
  },
};

const VerificationGateModal: React.FC<VerificationGateModalProps> = ({
  visible,
  gateType,
  onVerify,
  onDismiss,
}) => {
  const config = GATE_CONFIG[gateType];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <View style={styles.modalContainer}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>
              {gateType === 'phone' ? '\u260E' : gateType === 'id' ? '\uD83C\uDD94' : '\u2714\uFE0F'}
            </Text>
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.description}>{config.description}</Text>

          <Text style={styles.safetyNote}>
            This keeps our community safe for families
          </Text>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={onVerify}
            testID="gate-verify-button"
          >
            <Text style={styles.verifyButtonText}>{config.buttonText}</Text>
            <Text style={styles.timeEstimate}>{config.timeEstimate}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            testID="gate-dismiss-button"
          >
            <Text style={styles.dismissButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  safetyNote: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.lg,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeEstimate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

export default VerificationGateModal;
