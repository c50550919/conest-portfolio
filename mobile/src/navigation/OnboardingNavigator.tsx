/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest/SafeNest Onboarding Navigator
 * Handles new user registration and verification flow
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProgressBar from '../components/onboarding/ProgressBar';

// Onboarding screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PhoneVerificationScreen from '../screens/onboarding/PhoneVerificationScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import ChildrenInfoScreen from '../screens/onboarding/ChildrenInfoScreen';
import WorkScheduleScreen from '../screens/onboarding/WorkScheduleScreen';
import PreferencesScreen from '../screens/onboarding/PreferencesScreen';
import IDVerificationScreen from '../screens/onboarding/IDVerificationScreen';
import BackgroundCheckScreen from '../screens/onboarding/BackgroundCheckScreen';
import HouseholdSafetyDisclosureScreen from '../screens/household-safety/HouseholdSafetyDisclosureScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  PhoneVerification: { phoneNumber?: string };
  ProfileSetup: undefined;
  ChildrenInfo: undefined;
  WorkSchedule: undefined;
  Preferences: undefined;
  IDVerification: undefined;
  BackgroundCheck: undefined;
  HouseholdSafetyDisclosure: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const TOTAL_STEPS = 8; // Welcome is intro, not counted as a step

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        gestureEnabled: false, // Prevent swipe back during onboarding
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PhoneVerification"
        component={PhoneVerificationScreen}
        options={{
          header: () => <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          header: () => <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="ChildrenInfo"
        component={ChildrenInfoScreen}
        options={{
          header: () => <ProgressBar currentStep={3} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="WorkSchedule"
        component={WorkScheduleScreen}
        options={{
          header: () => <ProgressBar currentStep={4} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          header: () => <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="IDVerification"
        component={IDVerificationScreen}
        options={{
          header: () => <ProgressBar currentStep={6} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="BackgroundCheck"
        component={BackgroundCheckScreen}
        options={{
          header: () => <ProgressBar currentStep={7} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="HouseholdSafetyDisclosure"
        component={HouseholdSafetyDisclosureScreen}
        options={{
          header: () => <ProgressBar currentStep={8} totalSteps={TOTAL_STEPS} />,
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
