/**
 * Profile Setup Screen
 * Parent profile creation with react-hook-form and yup validation
 *
 * Constitution Compliance:
 * - Principle I: NO child PII - only collects parent information
 * - Principle IV: <500ms form validation performance
 *
 * Onboarding Step: 1 of 4
 * Data is saved to Redux and persisted to API at final onboarding step
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
  Image,
  TouchableOpacity,
  ActionSheetIOS,
  ImageStyle,
} from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  updateOnboardingData,
  setOnboardingStep,
  setError,
} from '../../store/slices/userSlice';
import type { RootState } from '../../store';

type ProfileSetupScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'ProfileSetup'
>;

interface Props {
  navigation: ProfileSetupScreenNavigationProp;
}

// Validation schema with yup
// Security: Validates and constrains input to prevent injection attacks
const profileSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .matches(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes',
    ),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .matches(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
    ),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email')
    .max(254, 'Email is too long'),
  dateOfBirth: yup
    .string()
    .required('Date of birth is required')
    .matches(
      /^\d{4}-\d{2}-\d{2}$/,
      'Please enter date in YYYY-MM-DD format',
    )
    .test('valid-date', 'Please enter a valid date', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .test('adult', 'You must be at least 18 years old', (value) => {
      if (!value) return false;
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      const isAdult = age > 18 || (age === 18 && monthDiff >= 0);
      return isAdult;
    }),
  bio: yup
    .string()
    .required('Bio is required')
    .min(20, 'Please write at least 20 characters about yourself')
    .max(500, 'Bio must be less than 500 characters'),
  occupation: yup
    .string()
    .required('Occupation is required')
    .min(2, 'Occupation must be at least 2 characters')
    .max(100, 'Occupation must be less than 100 characters'),
});

type ProfileFormData = yup.InferType<typeof profileSchema>;

// Maximum file size for profile photos (5MB)
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAsset, setPhotoAsset] = useState<Asset | null>(null);

  // Get existing onboarding data to pre-fill form (if user navigates back)
  const onboardingData = useSelector((state: RootState) => state.user.onboardingData);

  /**
   * Handle photo selection from camera or gallery
   * Validates file type and size before accepting
   */
  const handlePhotoResponse = useCallback((response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to select photo');
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Error', 'No photo selected');
      return;
    }

    // Validate file type
    if (asset.type && !ALLOWED_PHOTO_TYPES.includes(asset.type)) {
      Alert.alert(
        'Invalid File Type',
        'Please select a JPEG, PNG, or WebP image.',
      );
      return;
    }

    // Validate file size
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_SIZE_BYTES) {
      Alert.alert(
        'File Too Large',
        'Please select an image smaller than 5MB.',
      );
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoAsset(asset);
  }, []);

  /**
   * Show photo picker options (camera or gallery)
   */
  const showPhotoOptions = useCallback(() => {
    const options = ['Take Photo', 'Choose from Gallery', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            launchCamera(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
              },
              handlePhotoResponse,
            );
          } else if (buttonIndex === 1) {
            launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
              },
              handlePhotoResponse,
            );
          }
        },
      );
    } else {
      // Android - show Alert as ActionSheet alternative
      Alert.alert('Add Profile Photo', 'Choose an option', [
        {
          text: 'Take Photo',
          onPress: () =>
            launchCamera(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
              },
              handlePhotoResponse,
            ),
        },
        {
          text: 'Choose from Gallery',
          onPress: () =>
            launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
              },
              handlePhotoResponse,
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [handlePhotoResponse]);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: onboardingData.firstName || '',
      lastName: onboardingData.lastName || '',
      email: onboardingData.email || '',
      dateOfBirth: onboardingData.dateOfBirth || '',
      bio: onboardingData.bio || '',
      occupation: onboardingData.occupation || '',
    },
  });

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      try {
        setLoading(true);
        dispatch(setError(null));

        // Sanitize input before storing (trim whitespace)
        const sanitizedData: Record<string, unknown> = {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          dateOfBirth: data.dateOfBirth.trim(),
          bio: data.bio.trim(),
          occupation: data.occupation.trim(),
        };

        // Include photo data if selected (will be uploaded at final onboarding step)
        if (photoAsset && photoUri) {
          sanitizedData.profilePhotoUri = photoUri;
          sanitizedData.profilePhotoName = photoAsset.fileName || 'profile-photo.jpg';
          sanitizedData.profilePhotoType = photoAsset.type || 'image/jpeg';
        }

        // Save to Redux store for multi-step onboarding
        dispatch(updateOnboardingData(sanitizedData));
        dispatch(setOnboardingStep(1));

        // Navigate to next onboarding screen
        navigation.navigate('ChildrenInfo');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        dispatch(setError(errorMessage));
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, navigation, photoAsset, photoUri],
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
            <Text style={styles.title}>Create Your Profile</Text>
            <Text style={styles.subtitle}>
              Tell us about yourself (parent profile only - no child info)
            </Text>
          </View>

          {/* Profile Photo Picker */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={showPhotoOptions}
              style={styles.photoPickerContainer}
              testID="photo-picker"
              accessibilityLabel="Add profile photo"
              accessibilityHint="Tap to select a photo from camera or gallery"
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoPreview as ImageStyle}
                  testID="photo-preview"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="camera-plus" size={40} color={colors.text.secondary} />
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Icon name="pencil" size={16} color={colors.surface} />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              {photoUri ? 'Tap to change photo' : 'Add a profile photo'}
            </Text>
            <Text style={styles.photoSubhint}>
              JPEG, PNG, or WebP • Max 5MB
            </Text>
          </View>

          <View style={styles.form}>
            {/* First Name */}
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="First Name *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    error={!!errors.firstName}
                    left={<TextInput.Icon icon="account" />}
                    style={styles.input}
                    testID="firstName-input"
                  />
                  {errors.firstName && (
                    <HelperText type="error" visible={!!errors.firstName}>
                      {errors.firstName.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* Last Name */}
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Last Name *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    error={!!errors.lastName}
                    left={<TextInput.Icon icon="account" />}
                    style={styles.input}
                    testID="lastName-input"
                  />
                  {errors.lastName && (
                    <HelperText type="error" visible={!!errors.lastName}>
                      {errors.lastName.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Email Address *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={!!errors.email}
                    left={<TextInput.Icon icon="email" />}
                    style={styles.input}
                    testID="email-input"
                  />
                  {errors.email && (
                    <HelperText type="error" visible={!!errors.email}>
                      {errors.email.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* Date of Birth */}
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Date of Birth * (YYYY-MM-DD)"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    placeholder="1990-01-15"
                    error={!!errors.dateOfBirth}
                    left={<TextInput.Icon icon="calendar" />}
                    style={styles.input}
                    testID="dateOfBirth-input"
                  />
                  <HelperText type="info" visible={!errors.dateOfBirth}>
                    Format: YYYY-MM-DD (e.g., 1990-01-15)
                  </HelperText>
                  {errors.dateOfBirth && (
                    <HelperText type="error" visible={!!errors.dateOfBirth}>
                      {errors.dateOfBirth.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* Occupation */}
            <Controller
              control={control}
              name="occupation"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Occupation *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    error={!!errors.occupation}
                    left={<TextInput.Icon icon="briefcase" />}
                    style={styles.input}
                    testID="occupation-input"
                  />
                  {errors.occupation && (
                    <HelperText type="error" visible={!!errors.occupation}>
                      {errors.occupation.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            {/* Bio */}
            <Controller
              control={control}
              name="bio"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="About You *"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    error={!!errors.bio}
                    left={<TextInput.Icon icon="text" />}
                    style={[styles.input, styles.bioInput]}
                    placeholder="Tell potential roommates about yourself, your lifestyle, and what you're looking for..."
                    testID="bio-input"
                  />
                  <Text style={styles.charCount}>{value?.length || 0}/500</Text>
                  {errors.bio && (
                    <HelperText type="error" visible={!!errors.bio}>
                      {errors.bio.message}
                    </HelperText>
                  )}
                </View>
              )}
            />
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
  photoSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  photoPickerContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.medium,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  photoHint: {
    ...typography.body2,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  photoSubhint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  form: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
  },
  bioInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'right',
    marginTop: spacing.xs,
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

export default ProfileSetupScreen;
