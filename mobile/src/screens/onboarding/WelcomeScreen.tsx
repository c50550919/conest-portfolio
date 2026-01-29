/**
 * Welcome Screen
 * First screen in onboarding flow
 * Safety explanation and introduction
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logout } from '../../store/slices/authSlice';
import tokenStorage from '../../services/tokenStorage';

// Logo asset
const CoNestLogo = require('../../assets/images/conest-logo.png');

type WelcomeScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();

  /**
   * Handle "Already have an account? Log in" button
   * Clears current session and redirects to login screen
   */
  const handleLoginPress = async () => {
    // Clear tokens to trigger navigation to AuthNavigator (Login screen)
    await tokenStorage.clearTokens();
    dispatch(logout());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Image source={CoNestLogo} style={styles.logo} resizeMode="contain" />

          <Text style={styles.title}>Welcome to CoNest</Text>
          <Text style={styles.subtitle}>Safe, verified housing for single parents</Text>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Icon name="shield-check" size={32} color={colors.success} />
              <Text style={styles.featureTitle}>100% Verified</Text>
              <Text style={styles.featureText}>
                Background checks and ID verification for every member
              </Text>
            </View>

            <View style={styles.feature}>
              <Icon name="lock" size={32} color={colors.secondary} />
              <Text style={styles.featureTitle}>Privacy First</Text>
              <Text style={styles.featureText}>
                Your children's information stays private. Always.
              </Text>
            </View>

            <View style={styles.feature}>
              <Icon name="handshake" size={32} color={colors.tertiary} />
              <Text style={styles.featureTitle}>Perfect Matches</Text>
              <Text style={styles.featureText}>
                Smart compatibility matching based on lifestyle and preferences
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('PhoneVerification', {})}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="get-started-button"
          >
            Get Started
          </Button>
          <Button
            mode="text"
            onPress={handleLoginPress}
            style={styles.loginButton}
            testID="welcome-back-to-login-button"
          >
            Already have an account? Log in
          </Button>
        </View>
      </ScrollView>
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
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  featuresContainer: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  feature: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  featureTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  featureText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  loginButton: {
    marginTop: spacing.md,
  },
});

export default WelcomeScreen;
