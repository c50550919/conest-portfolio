/**
 * Profile Setup Screen
 * Parent profile creation with react-hook-form and yup validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type ProfileSetupScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'ProfileSetup'
>;

interface Props {
  navigation: ProfileSetupScreenNavigationProp;
}

// Validation schema with yup
const profileSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email'),
  bio: yup
    .string()
    .required('Bio is required')
    .min(20, 'Please write at least 20 characters about yourself')
    .max(500, 'Bio must be less than 500 characters'),
  occupation: yup
    .string()
    .required('Occupation is required')
    .min(2, 'Occupation must be at least 2 characters'),
});

type ProfileFormData = yup.InferType<typeof profileSchema>;

const ProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      // TODO: Save to Redux store and/or API
      console.log('Profile data:', data);

      // Navigate to next onboarding screen
      navigation.navigate('ChildrenInfo');
    } catch (error) {
      console.error('Profile setup error:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <Icon name="account-circle" size={64} color={colors.primary} />
            <Text style={styles.title}>Create Your Profile</Text>
            <Text style={styles.subtitle}>
              Tell us about yourself (parent profile only - no child info)
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
                  />
                  {errors.email && (
                    <HelperText type="error" visible={!!errors.email}>
                      {errors.email.message}
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
                  />
                  <Text style={styles.charCount}>
                    {value?.length || 0}/500
                  </Text>
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
            >
              Continue
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.backButton}
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
