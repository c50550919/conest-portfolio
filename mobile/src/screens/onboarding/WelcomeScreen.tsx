/**
 * Welcome Screen
 * First screen in onboarding flow
 * Safety explanation and introduction
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Button } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, spacing, typography } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type WelcomeScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Icon name="home-heart" size={80} color={colors.primary} />

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
              AI-powered compatibility matching for harmonious living
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
          onPress={() => {}}
          style={styles.loginButton}
          testID="welcome-back-to-login-button"
        >
          Already have an account? Log in
        </Button>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  featuresContainer: {
    marginTop: spacing.xxl,
    gap: spacing.xl,
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
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
});

export default WelcomeScreen;
