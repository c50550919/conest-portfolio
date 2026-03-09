/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Slim Onboarding Navigator
 * 2-step onboarding for OAuth users: Location → Budget (~90 seconds)
 *
 * Flow: OAuth login → LocationPicker → BudgetSelector → Main app
 * After completion: profile_completed = true, profile_completion_percentage = 40
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ProgressBar from '../components/onboarding/ProgressBar';
import LocationPickerScreen from '../screens/slim-onboarding/LocationPickerScreen';
import BudgetSelectorScreen from '../screens/slim-onboarding/BudgetSelectorScreen';

export type SlimOnboardingStackParamList = {
  LocationPicker: undefined;
  BudgetSelector: { city: string; state: string; zipCode: string };
};

const Stack = createStackNavigator<SlimOnboardingStackParamList>();

const TOTAL_STEPS = 2;

const SlimOnboardingNavigator: React.FC = () => {
  const userProfile = useSelector((state: RootState) => state.user.profile);

  // Resume logic: if user already has location, skip to BudgetSelector
  const hasLocation = Boolean(userProfile?.city && userProfile?.state);
  const initialRoute = hasLocation ? 'BudgetSelector' : 'LocationPicker';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="LocationPicker"
        component={LocationPickerScreen}
        options={{
          header: () => <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="BudgetSelector"
        component={BudgetSelectorScreen}
        options={{
          header: () => <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />,
        }}
      />
    </Stack.Navigator>
  );
};

export default SlimOnboardingNavigator;
