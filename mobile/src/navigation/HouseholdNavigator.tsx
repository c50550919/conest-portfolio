/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Navigator
 * Stack navigation for household management features
 *
 * Screens:
 * - HouseholdMain: Main household dashboard
 * - Documents: Document templates
 * - CreateHousehold: Create a new household
 * - PendingInvites: View pending household invitations
 * - ViewInvitation: View single invitation details
 *
 * Created: 2026-01-21
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HouseholdScreen from '../screens/main/HouseholdScreen';
import DocumentsScreen from '../screens/household/DocumentsScreen';
import CreateHouseholdScreen from '../screens/household/CreateHouseholdScreen';
import PendingInvitesScreen from '../screens/household/PendingInvitesScreen';
import ViewInvitationScreen from '../screens/household/ViewInvitationScreen';
import InviteMemberScreen from '../screens/household/InviteMemberScreen';

export type HouseholdStackParamList = {
  HouseholdMain: undefined;
  Documents: undefined;
  CreateHousehold: undefined;
  PendingInvites: undefined;
  ViewInvitation: { invitationId: string };
  InviteMember: undefined;
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
      <Stack.Screen
        name="PendingInvites"
        component={PendingInvitesScreen}
        options={{
          headerShown: false, // Screen has its own header
        }}
      />
      <Stack.Screen
        name="ViewInvitation"
        component={ViewInvitationScreen}
        options={{
          headerShown: false, // Screen has its own header
        }}
      />
      <Stack.Screen
        name="InviteMember"
        component={InviteMemberScreen}
        options={{
          headerShown: false, // Screen has its own header
        }}
      />
    </Stack.Navigator>
  );
};

export default HouseholdNavigator;
