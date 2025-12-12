/**
 * Work Schedule Screen
 * Collects schedule type and work from home preferences
 * FINAL STEP: Submits all onboarding data to create profile
 *
 * Constitution Compliance:
 * - Principle II: Secure data transmission
 *
 * Onboarding Step: 3 of 4 (Final data collection before verification)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Button, Switch, RadioButton, HelperText } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  updateOnboardingData,
  setOnboardingStep,
  setError,
  setUserProfile,
} from '../../store/slices/userSlice';
import type { RootState } from '../../store';
import api from '../../services/api';

type WorkScheduleScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'WorkSchedule'
>;

interface Props {
  navigation: WorkScheduleScreenNavigationProp;
}

type ScheduleType = 'flexible' | 'fixed' | 'shift_work';

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string; description: string }[] = [
  {
    value: 'flexible',
    label: 'Flexible Schedule',
    description: 'Remote work, freelance, or variable hours',
  },
  {
    value: 'fixed',
    label: 'Fixed Schedule',
    description: 'Regular 9-5 or set weekday hours',
  },
  {
    value: 'shift_work',
    label: 'Shift Work',
    description: 'Rotating shifts, nights, or weekends',
  },
];

const WorkScheduleScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('flexible');
  const [workFromHome, setWorkFromHome] = useState(false);

  // Get all accumulated onboarding data
  const onboardingData = useSelector((state: RootState) => state.user.onboardingData);

  const validateOnboardingData = useCallback((): string | null => {
    // Check required fields from previous screens
    if (!onboardingData.firstName?.trim()) {
      return 'First name is required. Please go back to Profile Setup.';
    }
    if (!onboardingData.lastName?.trim()) {
      return 'Last name is required. Please go back to Profile Setup.';
    }
    if (!onboardingData.dateOfBirth) {
      return 'Date of birth is required. Please go back to Profile Setup.';
    }
    if (!onboardingData.city?.trim()) {
      return 'City is required. Please go back to Children Info.';
    }
    if (!onboardingData.state?.trim()) {
      return 'State is required. Please go back to Children Info.';
    }
    if (!onboardingData.zipCode?.trim()) {
      return 'Zip code is required. Please go back to Children Info.';
    }
    if (onboardingData.budgetMin === undefined) {
      return 'Budget minimum is required. Please go back to Children Info.';
    }
    if (onboardingData.budgetMax === undefined) {
      return 'Budget maximum is required. Please go back to Children Info.';
    }
    return null;
  }, [onboardingData]);

  const onSubmit = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(setError(null));

      // Validate all required data is present
      const validationError = validateOnboardingData();
      if (validationError) {
        Alert.alert('Missing Information', validationError);
        setLoading(false);
        return;
      }

      // Save schedule data to Redux
      dispatch(
        updateOnboardingData({
          scheduleType,
          workFromHome,
        })
      );
      dispatch(setOnboardingStep(3));

      // Build profile data for API submission
      const profileData = {
        first_name: onboardingData.firstName!.trim(),
        last_name: onboardingData.lastName!.trim(),
        date_of_birth: onboardingData.dateOfBirth!,
        city: onboardingData.city!.trim(),
        state: onboardingData.state!.toUpperCase().trim(),
        zip_code: onboardingData.zipCode!.trim(),
        bio: onboardingData.bio?.trim(),
        occupation: onboardingData.occupation?.trim(),
        budget_min: onboardingData.budgetMin,
        budget_max: onboardingData.budgetMax,
        number_of_children: onboardingData.childrenCount,
        ages_of_children: onboardingData.childrenAgeGroups?.join(','),
        schedule_type: scheduleType,
        work_from_home: workFromHome,
        parenting_style: onboardingData.parentingStyle,
      };

      // Create profile via API
      const profileResponse = await api.createProfile(profileData);

      if (!profileResponse.success) {
        throw new Error(profileResponse.error || 'Failed to create profile');
      }

      // Upload profile photo if one was selected
      if (onboardingData.profilePhotoUri) {
        try {
          const formData = new FormData();
          const photoUri = onboardingData.profilePhotoUri;
          const filename = photoUri.split('/').pop() || 'photo.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append('photo', {
            uri: Platform.OS === 'ios' ? photoUri.replace('file://', '') : photoUri,
            name: filename,
            type,
          } as any);

          await api.uploadProfilePhoto(formData);
        } catch (photoError) {
          // Log but don't fail - photo can be uploaded later
          console.warn('Photo upload failed, continuing:', photoError);
        }
      }

      // Update Redux with created profile
      dispatch(
        setUserProfile({
          id: profileResponse.data.id,
          firstName: profileResponse.data.first_name,
          lastName: profileResponse.data.last_name,
          email: profileResponse.data.email || '',
          phone: profileResponse.data.phone || '',
          bio: profileResponse.data.bio,
          occupation: profileResponse.data.occupation,
          profilePhoto: profileResponse.data.profile_image_url,
          city: profileResponse.data.city,
          state: profileResponse.data.state,
          zipCode: profileResponse.data.zip_code,
          childrenCount: profileResponse.data.number_of_children || 0,
          childrenAgeGroups: profileResponse.data.ages_of_children?.split(',') || [],
          budgetMin: profileResponse.data.budget_min,
          budgetMax: profileResponse.data.budget_max,
          verifiedStatus: 'pending',
          backgroundCheckStatus: 'pending',
        })
      );

      // Navigate to verification flow
      Alert.alert(
        'Profile Created!',
        'Your profile has been created. Next, complete verification to start matching.',
        [
          {
            text: 'Continue to Verification',
            onPress: () => navigation.navigate('IDVerification'),
          },
        ]
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create profile';
      dispatch(setError(errorMessage));
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    dispatch,
    navigation,
    onboardingData,
    scheduleType,
    workFromHome,
    validateOnboardingData,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Icon name="calendar-clock" size={64} color={colors.primary} />
          <Text style={styles.title}>Work Schedule</Text>
          <Text style={styles.subtitle}>
            Help us match you with compatible schedules
          </Text>
        </View>

        <View style={styles.form}>
          {/* Schedule Type Selection */}
          <Text style={styles.sectionTitle}>What best describes your work schedule?</Text>
          <RadioButton.Group
            onValueChange={(value) => setScheduleType(value as ScheduleType)}
            value={scheduleType}
          >
            {SCHEDULE_OPTIONS.map((option) => (
              <View key={option.value} style={styles.radioOption}>
                <RadioButton.Item
                  label={option.label}
                  value={option.value}
                  position="leading"
                  style={styles.radioItem}
                  labelStyle={styles.radioLabel}
                  testID={`schedule-${option.value}`}
                />
                <Text style={styles.radioDescription}>{option.description}</Text>
              </View>
            ))}
          </RadioButton.Group>

          {/* Work From Home Toggle */}
          <View style={styles.switchContainer}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Work from home</Text>
              <Text style={styles.switchDescription}>
                Do you primarily work remotely?
              </Text>
            </View>
            <Switch
              value={workFromHome}
              onValueChange={setWorkFromHome}
              color={colors.primary}
              testID="work-from-home-switch"
            />
          </View>

          {/* Info Notice */}
          <View style={styles.infoNotice}>
            <Icon name="information" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Schedule compatibility helps match parents with similar childcare needs and
              availability for shared responsibilities.
            </Text>
          </View>

          {/* Summary of collected data */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Profile Summary</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Name" value={`${onboardingData.firstName || ''} ${onboardingData.lastName || ''}`} />
              <SummaryRow label="Location" value={`${onboardingData.city || ''}, ${onboardingData.state || ''}`} />
              <SummaryRow label="Budget" value={onboardingData.budgetMin && onboardingData.budgetMax ? `$${onboardingData.budgetMin} - $${onboardingData.budgetMax}/mo` : 'Not set'} />
              <SummaryRow label="Children" value={onboardingData.childrenCount !== undefined ? `${onboardingData.childrenCount}` : 'Not specified'} />
              <SummaryRow label="Photo" value={onboardingData.profilePhotoUri ? 'Selected' : 'None'} icon={onboardingData.profilePhotoUri ? 'check-circle' : 'alert-circle-outline'} />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={onSubmit}
            disabled={loading}
            loading={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="create-profile-button"
          >
            {loading ? 'Creating Profile...' : 'Create Profile & Continue'}
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
          <HelperText type="info" style={styles.helperText}>
            After creating your profile, you'll complete verification to start matching.
          </HelperText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper component for summary rows
const SummaryRow: React.FC<{ label: string; value: string; icon?: string }> = ({
  label,
  value,
  icon,
}) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <View style={styles.summaryValueContainer}>
      <Text style={styles.summaryValue}>{value}</Text>
      {icon && <Icon name={icon} size={16} color={icon === 'check-circle' ? colors.success : colors.warning} style={styles.summaryIcon} />}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  sectionTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  radioOption: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingBottom: spacing.sm,
  },
  radioItem: {
    paddingVertical: spacing.xs,
  },
  radioLabel: {
    ...typography.body1,
    color: colors.text.primary,
  },
  radioDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xl + spacing.lg,
    marginTop: -spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    ...typography.body1,
    color: colors.text.primary,
  },
  switchDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  infoNotice: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.caption,
    color: colors.info,
    marginLeft: spacing.sm,
    flex: 1,
  },
  summarySection: {
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.body2,
    color: colors.text.primary,
  },
  summaryIcon: {
    marginLeft: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
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
  helperText: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default WorkScheduleScreen;
