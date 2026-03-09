/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Contextual Prompt Sheet Component
 *
 * Bottom sheet for progressive profile completion prompts.
 * Each prompt type renders different input fields.
 * Must appear within 500ms of trigger (NFR-003).
 *
 * Constitution: Principle I (NO child PII required — children fields optional, FHA note shown)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import promptStateService, { PromptType } from '../../services/promptStateService';

interface ContextualPromptSheetProps {
  visible: boolean;
  promptType: PromptType;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onDismiss: () => void;
}

const PROMPT_CONFIG: Record<PromptType, { title: string; impact: string }> = {
  schedule: {
    title: 'Add Your Schedule',
    impact: 'Adding your schedule improves match quality by up to 30%',
  },
  parenting: {
    title: 'Parenting Style',
    impact: 'Share your parenting approach to find compatible roommates',
  },
  bio: {
    title: 'Tell Us About You',
    impact: 'A complete bio helps parents feel confident about connecting',
  },
  children: {
    title: 'Family Info',
    impact: 'Helps find families with similar age groups (optional)',
  },
};

const SCHEDULE_OPTIONS = [
  { label: 'Flexible', value: 'flexible' },
  { label: 'Fixed (9-5)', value: 'fixed' },
  { label: 'Shift Work', value: 'shift_work' },
];

const PARENTING_OPTIONS = [
  'Authoritative',
  'Gentle',
  'Free-range',
  'Attachment',
  'Montessori-inspired',
];

const AGE_GROUPS = ['0-2', '3-5', '6-9', '10-12', '13-17'];

const ContextualPromptSheet: React.FC<ContextualPromptSheetProps> = ({
  visible,
  promptType,
  onSubmit,
  onDismiss,
}) => {
  const config = PROMPT_CONFIG[promptType];

  // Schedule state
  const [scheduleType, setScheduleType] = useState<string>('');
  const [workFromHome, setWorkFromHome] = useState(false);

  // Parenting state
  const [parentingStyle, setParentingStyle] = useState('');

  // Bio state
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');

  // Children state
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAgeGroups, setChildrenAgeGroups] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDismiss = useCallback(async () => {
    await promptStateService.updatePromptDismissal(promptType);
    onDismiss();
  }, [promptType, onDismiss]);

  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    try {
      let data: Record<string, unknown> = {};

      switch (promptType) {
        case 'schedule':
          if (scheduleType) data.scheduleType = scheduleType;
          data.workFromHome = workFromHome;
          break;
        case 'parenting':
          if (parentingStyle) data.parentingStyle = parentingStyle;
          break;
        case 'bio':
          if (bio.trim()) data.bio = bio.trim();
          if (occupation.trim()) data.occupation = occupation.trim();
          break;
        case 'children':
          data.childrenCount = childrenCount;
          if (childrenAgeGroups.length > 0) data.childrenAgeGroups = childrenAgeGroups;
          break;
      }

      await onSubmit(data);
      await promptStateService.markPromptCompleted(promptType);
    } finally {
      setIsSubmitting(false);
    }
  }, [promptType, scheduleType, workFromHome, parentingStyle, bio, occupation, childrenCount, childrenAgeGroups, onSubmit]);

  const toggleAgeGroup = useCallback((group: string) => {
    setChildrenAgeGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group],
    );
  }, []);

  const renderFields = () => {
    switch (promptType) {
      case 'schedule':
        return (
          <View style={styles.fieldsContainer}>
            <Text style={styles.fieldLabel}>Work Schedule</Text>
            <View style={styles.chipRow}>
              {SCHEDULE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, scheduleType === opt.value && styles.chipSelected]}
                  onPress={() => setScheduleType(opt.value)}
                >
                  <Text style={[styles.chipText, scheduleType === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Work from home</Text>
              <Switch
                value={workFromHome}
                onValueChange={setWorkFromHome}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        );

      case 'parenting':
        return (
          <View style={styles.fieldsContainer}>
            <Text style={styles.fieldLabel}>Parenting Approach</Text>
            <View style={styles.chipRow}>
              {PARENTING_OPTIONS.map(style => (
                <TouchableOpacity
                  key={style}
                  style={[styles.chip, parentingStyle === style && styles.chipSelected]}
                  onPress={() => setParentingStyle(style)}
                >
                  <Text style={[styles.chipText, parentingStyle === style && styles.chipTextSelected]}>
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'bio':
        return (
          <View style={styles.fieldsContainer}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell other parents about yourself..."
              placeholderTextColor={colors.text.hint}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Occupation</Text>
            <TextInput
              style={styles.textInput}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Teacher, Nurse, Software Developer"
              placeholderTextColor={colors.text.hint}
              maxLength={100}
            />
          </View>
        );

      case 'children':
        return (
          <View style={styles.fieldsContainer}>
            <Text style={styles.fhaNote}>
              This information is optional and not used in matching scores.
            </Text>
            <Text style={styles.fieldLabel}>Number of Children</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setChildrenCount(Math.max(0, childrenCount - 1))}
              >
                <Text style={styles.stepperText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{childrenCount}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setChildrenCount(Math.min(10, childrenCount + 1))}
              >
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
            {childrenCount > 0 && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Age Groups</Text>
                <View style={styles.chipRow}>
                  {AGE_GROUPS.map(group => (
                    <TouchableOpacity
                      key={group}
                      style={[styles.chip, childrenAgeGroups.includes(group) && styles.chipSelected]}
                      onPress={() => toggleAgeGroup(group)}
                    >
                      <Text style={[styles.chipText, childrenAgeGroups.includes(group) && styles.chipTextSelected]}>
                        {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{config.title}</Text>
          <TouchableOpacity onPress={handleDismiss} testID="prompt-dismiss">
            <Text style={styles.closeButton}>X</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.impactText}>{config.impact}</Text>

        <ScrollView style={styles.sheetContent} keyboardShouldPersistTaps="handled">
          {renderFields()}
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
          testID="prompt-save"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    fontSize: 18,
    color: colors.text.secondary,
    fontWeight: '600',
    padding: spacing.xs,
  },
  impactText: {
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  sheetContent: {
    flexGrow: 0,
  },
  fieldsContainer: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.medium,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5E9',
  },
  chipText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  textArea: {
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text.primary,
  },
  charCount: {
    fontSize: 11,
    color: colors.text.hint,
    textAlign: 'right',
  },
  textInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
  },
  fhaNote: {
    fontSize: 12,
    color: colors.text.hint,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContextualPromptSheet;
