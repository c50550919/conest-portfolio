/**
 * CoNest/SafeNest Onboarding Navigator
 * Handles new user registration and verification flow
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Placeholder screens - will be created in screens folder
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PhoneVerificationScreen from '../screens/onboarding/PhoneVerificationScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import ChildrenInfoScreen from '../screens/onboarding/ChildrenInfoScreen';
import WorkScheduleScreen from '../screens/onboarding/WorkScheduleScreen';
import PreferencesScreen from '../screens/onboarding/PreferencesScreen';
import IDVerificationScreen from '../screens/onboarding/IDVerificationScreen';
import BackgroundCheckScreen from '../screens/onboarding/BackgroundCheckScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  PhoneVerification: { phoneNumber?: string };
  ProfileSetup: undefined;
  ChildrenInfo: undefined;
  WorkSchedule: undefined;
  Preferences: undefined;
  IDVerification: undefined;
  BackgroundCheck: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent swipe back during onboarding
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="ChildrenInfo" component={ChildrenInfoScreen} />
      <Stack.Screen name="WorkSchedule" component={WorkScheduleScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="IDVerification" component={IDVerificationScreen} />
      <Stack.Screen name="BackgroundCheck" component={BackgroundCheckScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
