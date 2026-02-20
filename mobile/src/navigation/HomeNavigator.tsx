/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Home Navigator
 * Stack navigation for home/dashboard with connection requests
 *
 * Screens:
 * - HomeScreen: Dashboard with stats and quick actions
 * - ConnectionRequests: View and manage connection requests
 * - Documents: Household document templates
 * - CreateHousehold: Create a new household
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/main/HomeScreen';
import ConnectionRequestsScreen from '../screens/main/ConnectionRequestsScreen';
import DocumentsScreen from '../screens/household/DocumentsScreen';
import CreateHouseholdScreen from '../screens/household/CreateHouseholdScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  ConnectionRequests: undefined;
  Documents: undefined;
  CreateHousehold: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

const HomeNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ConnectionRequests" component={ConnectionRequestsScreen} />
      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          headerShown: true,
          title: 'Documents',
        }}
      />
      <Stack.Screen
        name="CreateHousehold"
        component={CreateHouseholdScreen}
        options={{
          headerShown: false, // Screen has its own header
        }}
      />
    </Stack.Navigator>
  );
};

export default HomeNavigator;
