/**
 * Phone Verification Screen
 * OTP verification (placeholder with testing bypass)
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import { setOnboardingComplete } from '../../store/slices/authSlice';

type PhoneVerificationScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'PhoneVerification'
>;

interface Props {
  navigation: PhoneVerificationScreenNavigationProp;
}

const PhoneVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();

  const handleSkipForTesting = () => {
    // Set auth state to bypass onboarding for testing
    // Note: loginSuccess should be used instead, but for testing we just mark onboarding complete
    dispatch(setOnboardingComplete(true));
  };

  const handleContinueOnboarding = () => {
    // Navigate to ProfileSetup to continue normal onboarding flow
    navigation.navigate('ProfileSetup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Phone Verification</Text>
        <Text style={styles.subtitle}>
          This screen will implement OTP verification
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSkipForTesting}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="skip-to-main-button"
          >
            Skip to Main App (Testing)
          </Button>

          <Button
            mode="outlined"
            onPress={handleContinueOnboarding}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="continue-onboarding-button"
          >
            Continue Onboarding Flow
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            testID="back-button"
          >
            Back
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  buttonContent: {
    height: 56,
  },
  backButton: {
    marginTop: spacing.sm,
  },
});

export default PhoneVerificationScreen;
