/**
 * VerificationNavigator
 * Task: T031
 *
 * Stack navigator for verification flow with all 6 screens.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { VerificationStackParamList } from '../types/verification';
import { colors, typography } from '../theme';

// Import screens
import {
  VerificationDashboardScreen,
  PhoneVerificationScreen,
  EmailVerificationScreen,
  IDVerificationScreen,
  BackgroundCheckScreen,
  IncomeVerificationScreen,
} from '../screens/verification';
import HouseholdSafetyDisclosureScreen from '../screens/household-safety/HouseholdSafetyDisclosureScreen';

const Stack = createStackNavigator<VerificationStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.surface,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTitleStyle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  headerTintColor: colors.primary,
  headerBackTitleVisible: false,
  cardStyle: {
    backgroundColor: colors.background,
  },
};

export const VerificationNavigator: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={VerificationDashboardScreen}
        options={{
          title: 'Verification',
          headerLeft: undefined, // Hide back button on dashboard
        }}
      />
      <Stack.Screen
        name="PhoneVerification"
        component={PhoneVerificationScreen}
        options={{
          title: 'Phone Verification',
        }}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{
          title: 'Email Verification',
        }}
      />
      <Stack.Screen
        name="IDVerification"
        component={IDVerificationScreen}
        options={{
          title: 'ID Verification',
        }}
      />
      <Stack.Screen
        name="BackgroundCheck"
        component={BackgroundCheckScreen}
        options={{
          title: 'Background Check',
        }}
      />
      <Stack.Screen
        name="HouseholdSafetyDisclosure"
        component={HouseholdSafetyDisclosureScreen}
        options={{
          title: 'Household Safety',
        }}
      />
      <Stack.Screen
        name="IncomeVerification"
        component={IncomeVerificationScreen}
        options={{
          title: 'Income Verification',
        }}
      />
    </Stack.Navigator>
  );
};

export default VerificationNavigator;
