/**
 * Create Household Screen
 *
 * Purpose: Form for creating a new household
 * Constitution: Principle I (Child Safety - NO child data collected)
 *
 * Fields:
 * - Household name
 * - Address (street, city, state, zip)
 * - Monthly rent (optional)
 * - Lease start date (optional)
 *
 * Created: 2026-01-22
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { createHousehold } from '../../store/slices/householdSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';

// US State codes for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface FormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: string; // Store as string for input, convert to cents on submit
  leaseStartDate: string; // YYYY-MM-DD format
}

interface FormErrors {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  monthlyRent?: string;
  leaseStartDate?: string;
}

const CreateHouseholdScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector((state: RootState) => state.household.loading);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    monthlyRent: '',
    leaseStartDate: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showStatePicker, setShowStatePicker] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Household name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.length > 200) {
      newErrors.address = 'Address cannot exceed 200 characters';
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.length > 100) {
      newErrors.city = 'City cannot exceed 100 characters';
    }

    // State validation
    if (!formData.state) {
      newErrors.state = 'State is required';
    } else if (!US_STATES.includes(formData.state)) {
      newErrors.state = 'Please select a valid state';
    }

    // Zip code validation
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    } else if (!/^\d{5}$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Zip code must be exactly 5 digits';
    }

    // Monthly rent validation (optional but must be valid if provided)
    if (formData.monthlyRent) {
      const rentValue = parseFloat(formData.monthlyRent);
      if (isNaN(rentValue) || rentValue <= 0) {
        newErrors.monthlyRent = 'Please enter a valid rent amount';
      } else if (rentValue > 999999.99) {
        newErrors.monthlyRent = 'Rent cannot exceed $999,999.99';
      }
    }

    // Lease start date validation (optional but must be valid format if provided)
    if (formData.leaseStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.leaseStartDate)) {
      newErrors.leaseStartDate = 'Please use YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Convert rent to cents (API expects cents)
      const monthlyRentCents = formData.monthlyRent
        ? Math.round(parseFloat(formData.monthlyRent) * 100)
        : 0;

      const result = await dispatch(
        createHousehold({
          name: formData.name.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state,
          zipCode: formData.zipCode,
          monthlyRent: monthlyRentCents || 100, // Default to $1.00 if not provided (API requires positive)
          ...(formData.leaseStartDate && { leaseStartDate: formData.leaseStartDate }),
        })
      ).unwrap();

      // Success - navigate to household screen
      Alert.alert(
        'Household Created!',
        `"${result.household.name}" has been created successfully. You can now invite members to join.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Household' as never),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to create household. Please try again.');
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="back-button"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Household</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Icon name="information-outline" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              Create a household to manage expenses, schedules, and documents with your co-living
              partners.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Household Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Household Name *</Text>
              <TextInput
                testID="household-name-input"
                style={[styles.input, errors.name ? styles.inputError : null]}
                placeholder="e.g., Our Home, Mountain View House"
                placeholderTextColor={colors.text.hint}
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
                maxLength={100}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                testID="address-input"
                style={[styles.input, errors.address ? styles.inputError : null]}
                placeholder="123 Main Street, Apt 4B"
                placeholderTextColor={colors.text.hint}
                value={formData.address}
                onChangeText={(text) => updateField('address', text)}
                maxLength={200}
              />
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                testID="city-input"
                style={[styles.input, errors.city ? styles.inputError : null]}
                placeholder="San Francisco"
                placeholderTextColor={colors.text.hint}
                value={formData.city}
                onChangeText={(text) => updateField('city', text)}
                maxLength={100}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>

            {/* State and Zip Code Row */}
            <View style={styles.row}>
              {/* State */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>State *</Text>
                <TouchableOpacity
                  testID="state-picker-button"
                  style={[styles.input, styles.pickerButton, errors.state ? styles.inputError : null]}
                  onPress={() => setShowStatePicker(!showStatePicker)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !formData.state && styles.placeholderText,
                    ]}
                  >
                    {formData.state || 'Select'}
                  </Text>
                  <Icon
                    name={showStatePicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>

              {/* Zip Code */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Zip Code *</Text>
                <TextInput
                  testID="zipcode-input"
                  style={[styles.input, errors.zipCode ? styles.inputError : null]}
                  placeholder="94105"
                  placeholderTextColor={colors.text.hint}
                  value={formData.zipCode}
                  onChangeText={(text) => updateField('zipCode', text.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={5}
                />
                {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
              </View>
            </View>

            {/* State Picker Dropdown */}
            {showStatePicker && (
              <View style={styles.statePicker}>
                <ScrollView style={styles.statePickerScroll} nestedScrollEnabled>
                  {US_STATES.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.stateOption,
                        formData.state === state && styles.stateOptionSelected,
                      ]}
                      onPress={() => {
                        updateField('state', state);
                        setShowStatePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.stateOptionText,
                          formData.state === state && styles.stateOptionTextSelected,
                        ]}
                      >
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Monthly Rent (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monthly Rent</Text>
              <View style={[styles.input, styles.currencyInput, errors.monthlyRent ? styles.inputError : null]}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  testID="rent-input"
                  style={styles.currencyTextInput}
                  placeholder="2,400.00"
                  placeholderTextColor={colors.text.hint}
                  value={formData.monthlyRent}
                  onChangeText={(text) => updateField('monthlyRent', text.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.monthlyRent && <Text style={styles.errorText}>{errors.monthlyRent}</Text>}
              <Text style={styles.helperText}>Optional - can be added later</Text>
            </View>

            {/* Lease Start Date (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lease Start Date</Text>
              <TextInput
                testID="lease-start-input"
                style={[styles.input, errors.leaseStartDate ? styles.inputError : null]}
                placeholder="YYYY-MM-DD (e.g., 2026-02-01)"
                placeholderTextColor={colors.text.hint}
                value={formData.leaseStartDate}
                onChangeText={(text) => updateField('leaseStartDate', text)}
              />
              {errors.leaseStartDate && (
                <Text style={styles.errorText}>{errors.leaseStartDate}</Text>
              )}
              <Text style={styles.helperText}>Optional - when does your lease begin?</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            testID="create-household-submit"
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="home-plus" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Create Household</Text>
              </>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body2,
    color: colors.primaryDark,
    flex: 1,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.subtitle2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  helperText: {
    ...typography.caption,
    color: colors.text.hint,
    marginTop: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    ...typography.body1,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.hint,
  },
  statePicker: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    maxHeight: 200,
  },
  statePickerScroll: {
    maxHeight: 200,
  },
  stateOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  stateOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  stateOptionText: {
    ...typography.body1,
    color: colors.text.primary,
  },
  stateOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    ...typography.body1,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  currencyTextInput: {
    flex: 1,
    ...typography.body1,
    color: colors.text.primary,
    padding: 0,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});

export default CreateHouseholdScreen;
