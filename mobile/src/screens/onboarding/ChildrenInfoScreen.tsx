/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Children Info & Location Screen
 * Collects FHA-compliant children info (optional) + location + budget
 *
 * Constitution Compliance:
 * - Principle I: NO child PII - only aggregated counts and age groups
 * - FHA: Child info is OPTIONAL (user-initiated disclosure)
 *
 * Onboarding Step: 2 of 4
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button, TextInput, HelperText, Chip } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  updateOnboardingData,
  setOnboardingStep,
  setError,
} from '../../store/slices/userSlice';
import type { RootState } from '../../store';

type ChildrenInfoScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'ChildrenInfo'
>;

interface Props {
  navigation: ChildrenInfoScreenNavigationProp;
}

// Age group options for children
const AGE_GROUPS = [
  { id: 'infant', label: 'Infant (0-1)' },
  { id: 'toddler', label: 'Toddler (2-4)' },
  { id: 'elementary', label: 'Elementary (5-10)' },
  { id: 'preteen', label: 'Preteen (11-13)' },
  { id: 'teen', label: 'Teen (14-17)' },
];

// Form data interface for explicit typing
interface ChildrenInfoFormData {
  numberOfChildren?: number;
  city: string;
  state: string;
  zipCode: string;
  budgetMin: number;
  budgetMax: number;
}

const childrenInfoSchema: yup.ObjectSchema<ChildrenInfoFormData> = yup.object({
  // Children info is OPTIONAL (FHA compliance)
  numberOfChildren: yup
    .number()
    .min(0, 'Number of children must be 0 or more')
    .max(10, 'Please enter a valid number')
    .optional()
    .transform((value) => (isNaN(value) ? undefined : value)),
  // Location is required
  city: yup
    .string()
    .required('City is required')
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City name is too long'),
  state: yup
    .string()
    .required('State is required')
    .length(2, 'Use 2-letter state code (e.g., CA)')
    .uppercase(),
  zipCode: yup
    .string()
    .required('Zip code is required')
    .matches(/^\d{5}$/, 'Enter a valid 5-digit zip code'),
  // Budget is required
  budgetMin: yup
    .number()
    .required('Minimum budget is required')
    .min(0, 'Budget must be positive')
    .transform((value) => (isNaN(value) ? undefined : value)),
  budgetMax: yup
    .number()
    .required('Maximum budget is required')
    .min(0, 'Budget must be positive')
    .transform((value) => (isNaN(value) ? undefined : value))
    .test('greater-than-min', 'Max must be greater than min', function (value) {
      const { budgetMin } = this.parent;
      return !value || !budgetMin || value >= budgetMin;
    }),
});

// Using the explicit interface above instead of yup.InferType for better type compatibility

const ChildrenInfoScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);

  // Get existing onboarding data
  const onboardingData = useSelector((state: RootState) => state.user.onboardingData);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ChildrenInfoFormData>({
    resolver: yupResolver(childrenInfoSchema),
    mode: 'onChange',
    defaultValues: {
      numberOfChildren: onboardingData.childrenCount,
      city: onboardingData.city || '',
      state: onboardingData.state || '',
      zipCode: onboardingData.zipCode || '',
      budgetMin: onboardingData.budgetMin,
      budgetMax: onboardingData.budgetMax,
    },
  });

  // Initialize selected age groups from Redux
  React.useEffect(() => {
    if (onboardingData.childrenAgeGroups) {
      setSelectedAgeGroups(onboardingData.childrenAgeGroups);
    }
  }, [onboardingData.childrenAgeGroups]);

  const toggleAgeGroup = useCallback((groupId: string) => {
    setSelectedAgeGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const onSubmit = useCallback(
    async (data: ChildrenInfoFormData) => {
      try {
        setLoading(true);
        dispatch(setError(null));

        // Save to Redux store
        dispatch(
          updateOnboardingData({
            childrenCount: data.numberOfChildren,
            childrenAgeGroups: selectedAgeGroups,
            city: data.city.trim(),
            state: data.state.toUpperCase().trim(),
            zipCode: data.zipCode.trim(),
            budgetMin: data.budgetMin,
            budgetMax: data.budgetMax,
          })
        );
        dispatch(setOnboardingStep(2));

        // Navigate to WorkSchedule screen
        navigation.navigate('WorkSchedule');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        dispatch(setError(errorMessage));
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, navigation, selectedAgeGroups]
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Icon name="home-heart" size={64} color={colors.primary} />
            <Text style={styles.title}>Location & Household</Text>
            <Text style={styles.subtitle}>
              Help us find compatible roommates in your area
            </Text>
          </View>

          <View style={styles.form}>
            {/* FHA Notice */}
            <View style={styles.fhaNotice}>
              <Icon name="information" size={20} color={colors.info} />
              <Text style={styles.fhaText}>
                Children info is optional. Sharing helps match with compatible schedules but is not required.
              </Text>
            </View>

            {/* Number of Children (Optional) */}
            <Controller
              control={control}
              name="numberOfChildren"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Number of Children (Optional)"
                    value={value?.toString() || ''}
                    onChangeText={(text) => onChange(parseInt(text, 10) || undefined)}
                    onBlur={onBlur}
                    mode="outlined"
                    keyboardType="number-pad"
                    error={!!errors.numberOfChildren}
                    left={<TextInput.Icon icon="account-child" />}
                    style={styles.input}
                    testID="children-count-input"
                  />
                  {errors.numberOfChildren && (
                    <HelperText type="error" visible={!!errors.numberOfChildren}>
                      {errors.numberOfChildren.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* Age Groups (Optional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Children Age Groups (Optional)</Text>
              <View style={styles.chipContainer}>
                {AGE_GROUPS.map((group) => (
                  <Chip
                    key={group.id}
                    selected={selectedAgeGroups.includes(group.id)}
                    onPress={() => toggleAgeGroup(group.id)}
                    style={styles.chip}
                    mode="outlined"
                    testID={`age-group-${group.id}`}
                  >
                    {group.label}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* City */}
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="City *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    error={!!errors.city}
                    left={<TextInput.Icon icon="city" />}
                    style={styles.input}
                    testID="city-input"
                  />
                  {errors.city && (
                    <HelperText type="error" visible={!!errors.city}>
                      {errors.city.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* State and Zip Row */}
            <View style={styles.row}>
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <TextInput
                      label="State *"
                      value={value}
                      onChangeText={(text) => onChange(text.toUpperCase())}
                      onBlur={onBlur}
                      mode="outlined"
                      maxLength={2}
                      autoCapitalize="characters"
                      error={!!errors.state}
                      style={styles.input}
                      placeholder="CA"
                      testID="state-input"
                    />
                    {errors.state && (
                      <HelperText type="error" visible={!!errors.state}>
                        {errors.state.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="zipCode"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <TextInput
                      label="Zip Code *"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={5}
                      error={!!errors.zipCode}
                      style={styles.input}
                      placeholder="94102"
                      testID="zipcode-input"
                    />
                    {errors.zipCode && (
                      <HelperText type="error" visible={!!errors.zipCode}>
                        {errors.zipCode.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />
            </View>

            {/* Budget Section */}
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            <View style={styles.row}>
              <Controller
                control={control}
                name="budgetMin"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <TextInput
                      label="Minimum *"
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseInt(text, 10) || undefined)}
                      onBlur={onBlur}
                      mode="outlined"
                      keyboardType="number-pad"
                      error={!!errors.budgetMin}
                      left={<TextInput.Icon icon="currency-usd" />}
                      style={styles.input}
                      testID="budget-min-input"
                    />
                    {errors.budgetMin && (
                      <HelperText type="error" visible={!!errors.budgetMin}>
                        {errors.budgetMin.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="budgetMax"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <TextInput
                      label="Maximum *"
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseInt(text, 10) || undefined)}
                      onBlur={onBlur}
                      mode="outlined"
                      keyboardType="number-pad"
                      error={!!errors.budgetMax}
                      left={<TextInput.Icon icon="currency-usd" />}
                      style={styles.input}
                      testID="budget-max-input"
                    />
                    {errors.budgetMax && (
                      <HelperText type="error" visible={!!errors.budgetMax}>
                        {errors.budgetMax.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || loading}
              loading={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              testID="continue-button"
            >
              Continue
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.backButton}
              testID="back-button"
            >
              Back
            </Button>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  fhaNotice: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  fhaText: {
    ...typography.caption,
    color: colors.info,
    marginLeft: spacing.sm,
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  backButton: {
    marginTop: spacing.sm,
  },
});

export default ChildrenInfoScreen;
