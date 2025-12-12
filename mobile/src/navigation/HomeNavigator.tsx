/**
 * Home Navigator
 * Stack navigation for home/dashboard with connection requests
 *
 * Screens:
 * - HomeScreen: Dashboard with stats and quick actions
 * - ConnectionRequests: View and manage connection requests
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/main/HomeScreen';
import ConnectionRequestsScreen from '../screens/main/ConnectionRequestsScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;
  ConnectionRequests: undefined;
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
    </Stack.Navigator>
  );
};

export default HomeNavigator;
