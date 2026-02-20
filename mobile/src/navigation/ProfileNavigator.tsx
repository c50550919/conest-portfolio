/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Profile Navigator
 * Stack navigation for profile screens including verification flow
 *
 * Screens:
 * - ProfileScreen: User profile and settings
 * - Verification: Nested verification flow
 * - AccountStatus: Moderation status, warnings, suspensions
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/main/ProfileScreen';
import { VerificationNavigator } from './VerificationNavigator';
import AccountStatusScreen from '../screens/moderation/AccountStatusScreen';
import type { VerificationStackParamList } from '../types/verification';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Verification: NavigatorScreenParams<VerificationStackParamList>;
  AccountStatus: undefined;
};

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen
        name="Verification"
        component={VerificationNavigator}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="AccountStatus"
        component={AccountStatusScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
