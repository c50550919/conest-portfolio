/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * ReportModal Component
 * Modal for reporting inappropriate messages
 * Allows users to select report type and provide description
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';

export type ReportType =
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'scam'
  | 'child_safety_concern'
  | 'other';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ReportOption {
  type: ReportType;
  label: string;
  icon: string;
  severity: ReportSeverity;
  description: string;
}

interface ReportModalProps {
  visible: boolean;
  messageId: string;
  messageContent: string;
  onClose: () => void;
  onSubmit: (params: {
    messageId: string;
    reportType: ReportType;
    severity: ReportSeverity;
    description: string;
  }) => Promise<void>;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: 'child_safety_concern',
    label: 'Child Safety Concern',
    icon: 'shield-alert',
    severity: 'critical',
    description: 'Content that may pose a risk to child safety',
  },
  {
    type: 'harassment',
    label: 'Harassment or Bullying',
    icon: 'account-alert',
    severity: 'high',
    description: 'Threatening, abusive, or harassing behavior',
  },
  {
    type: 'inappropriate_content',
    label: 'Inappropriate Content',
    icon: 'alert-circle',
    severity: 'medium',
    description: 'Offensive, explicit, or inappropriate material',
  },
  {
    type: 'scam',
    label: 'Scam or Fraud',
    icon: 'cash-remove',
    severity: 'high',
    description: 'Fraudulent or deceptive content',
  },
  {
    type: 'spam',
    label: 'Spam',
    icon: 'email-multiple',
    severity: 'low',
    description: 'Unwanted or repetitive messages',
  },
  {
    type: 'other',
    label: 'Other',
    icon: 'dots-horizontal',
    severity: 'medium',
    description: 'Other concerns not listed above',
  },
];

const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  messageId,
  messageContent,
  onClose,
  onSubmit,
}) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) {
      return;
    }
    setSelectedType(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedType || submitting) {
      return;
    }

    const selectedOption = REPORT_OPTIONS.find((opt) => opt.type === selectedType);
    if (!selectedOption) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        messageId,
        reportType: selectedType,
        severity: selectedOption.severity,
        description: description.trim(),
      });

      // Reset form and close
      setSelectedType(null);
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedType !== null && !submitting;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Report Message</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Message Preview */}
            <View style={styles.messagePreview}>
              <Text style={styles.messagePreviewLabel}>Reported Message:</Text>
              <Text style={styles.messagePreviewText} numberOfLines={3}>
                {messageContent}
              </Text>
            </View>

            {/* Report Type Selection */}
            <Text style={styles.sectionTitle}>Select Reason</Text>
            <View style={styles.optionsContainer}>
              {REPORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.optionCard,
                    selectedType === option.type && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedType(option.type)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionHeader}>
                    <Icon
                      name={option.icon}
                      size={24}
                      color={selectedType === option.type ? colors.primary : colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedType === option.type && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selectedType === option.type && (
                      <Icon
                        name="check-circle"
                        size={20}
                        color={colors.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </View>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description Input */}
            <Text style={styles.sectionTitle}>
              Additional Details <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Provide any additional context..."
              placeholderTextColor={colors.text.secondary}
              multiline
              maxLength={500}
              editable={!submitting}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{description.length} / 500</Text>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  messagePreview: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  messagePreviewLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  messagePreviewText: {
    ...typography.body2,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  optional: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  optionLabel: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
    marginLeft: spacing.sm,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  optionDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: 32,
  },
  descriptionInput: {
    ...typography.body1,
    color: colors.text.primary,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  characterCount: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 10,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  submitButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ReportModal;
