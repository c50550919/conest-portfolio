/**
 * Household Navigator
 * Stack navigation for household management features
 *
 * Screens:
 * - HouseholdMain: Main household dashboard
 * - Documents: Document templates
 * - CreateHousehold: Create a new household
 *
 * Created: 2026-01-21
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HouseholdScreen from '../screens/main/HouseholdScreen';
import DocumentsScreen from '../screens/household/DocumentsScreen';
import CreateHouseholdScreen from '../screens/household/CreateHouseholdScreen';

export type HouseholdStackParamList = {
  HouseholdMain: undefined;
  Documents: undefined;
  CreateHousehold: undefined;
};

const Stack = createStackNavigator<HouseholdStackParamList>();

const HouseholdNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="HouseholdMain"
        component={HouseholdScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          headerTitle: 'Documents',
          headerBackTitle: 'Back',
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

export default HouseholdNavigator;
