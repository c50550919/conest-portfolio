/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Budget Selector Screen (Slim Onboarding Step 2)
 *
 * Allows OAuth users to set their monthly housing budget range.
 * Uses quick-pick chips + manual input (no slider dependency).
 *
 * Flow: LocationPicker → [this screen] → Discovery (Main app)
 * On completion: profile_completed = true, profile_completion_percentage = 40
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { RouteProp, useRoute } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../../theme';
import { SlimOnboardingStackParamList } from '../../navigation/SlimOnboardingNavigator';
import profileAPI from '../../services/api/profileAPI';
import { setOnboardingComplete } from '../../store/slices/authSlice';
import { setBudgetData, setLocationData } from '../../store/slices/userSlice';

type ScreenRouteProp = RouteProp<SlimOnboardingStackParamList, 'BudgetSelector'>;

interface BudgetPreset {
  label: string;
  min: number;
  max: number;
}

const BUDGET_PRESETS: BudgetPreset[] = [
  { label: '< $800', min: 0, max: 800 },
  { label: '$800 \u2013 $1,200', min: 800, max: 1200 },
  { label: '$1,200 \u2013 $1,800', min: 1200, max: 1800 },
  { label: '$1,800+', min: 1800, max: 5000 },
];

const BudgetSelectorScreen: React.FC = () => {
  const dispatch = useDispatch();
  const route = useRoute<ScreenRouteProp>();
  const { city, state, zipCode } = route.params;
  const [budgetMin, setBudgetMin] = useState(600);
  const [budgetMax, setBudgetMax] = useState(1500);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetSelect = useCallback((index: number) => {
    const preset = BUDGET_PRESETS[index];
    setBudgetMin(preset.min);
    setBudgetMax(preset.max);
    setSelectedPreset(index);
  }, []);

  const handleMinChange = useCallback((text: string) => {
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(value)) {
      setBudgetMin(Math.min(value, 50000));
      setSelectedPreset(null);
    } else if (text === '') {
      setBudgetMin(0);
      setSelectedPreset(null);
    }
  }, []);

  const handleMaxChange = useCallback((text: string) => {
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(value)) {
      setBudgetMax(Math.min(value, 50000));
      setSelectedPreset(null);
    } else if (text === '') {
      setBudgetMax(0);
      setSelectedPreset(null);
    }
  }, []);

  const isValid = budgetMax >= budgetMin && budgetMax > 0;

  const handleContinue = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Invalid Budget', 'Maximum budget must be at least the minimum.');
      return;
    }

    setIsSubmitting(true);
    try {
      await profileAPI.updateBudget({ budgetMin, budgetMax });

      // Update Redux state
      dispatch(setLocationData({ city, state, zipCode }));
      dispatch(setBudgetData({
        budgetMin,
        budgetMax,
        profileCompletionPercentage: 40,
      }));
      dispatch(setOnboardingComplete(true));
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save budget. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [budgetMin, budgetMax, isValid, dispatch, city, state, zipCode]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>What's your monthly housing budget?</Text>
          <Text style={styles.subtitle}>We'll match you with parents in your range</Text>
        </View>

        <View style={styles.displayContainer}>
          <Text style={styles.budgetDisplay}>
            ${budgetMin.toLocaleString()} \u2014 ${budgetMax.toLocaleString()}
          </Text>
          <Text style={styles.perMonth}>per month</Text>
        </View>

        <View style={styles.presetsContainer}>
          {BUDGET_PRESETS.map((preset, index) => (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetChip,
                selectedPreset === index && styles.presetChipSelected,
              ]}
              onPress={() => handlePresetSelect(index)}
              testID={`budget-preset-${index}`}
            >
              <Text
                style={[
                  styles.presetChipText,
                  selectedPreset === index && styles.presetChipTextSelected,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputsRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Min</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.budgetInput}
                value={budgetMin.toString()}
                onChangeText={handleMinChange}
                keyboardType="number-pad"
                maxLength={5}
                testID="budget-min-input"
              />
            </View>
          </View>
          <Text style={styles.inputDash}>\u2014</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.budgetInput}
                value={budgetMax.toString()}
                onChangeText={handleMaxChange}
                keyboardType="number-pad"
                maxLength={5}
                testID="budget-max-input"
              />
            </View>
          </View>
        </View>

        {!isValid && (
          <Text style={styles.errorText}>
            Maximum must be greater than or equal to minimum
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, (!isValid || isSubmitting) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid || isSubmitting}
          testID="continue-button"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  displayContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  budgetDisplay: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  perMonth: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.medium,
    backgroundColor: colors.surface,
  },
  presetChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5E9',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  presetChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.sm + 4,
    height: 48,
  },
  dollarSign: {
    fontSize: 16,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  budgetInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    padding: 0,
  },
  inputDash: {
    fontSize: 18,
    color: colors.text.secondary,
    marginTop: 20,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BudgetSelectorScreen;
