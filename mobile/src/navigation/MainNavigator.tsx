/**
 * CoNest/SafeNest Main Navigator
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/main/HomeScreen';
import { BrowseDiscoveryScreen } from '../screens/main/BrowseDiscoveryScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import HouseholdScreen from '../screens/main/HouseholdScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

import { theme } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Browse: undefined;
  Messages: undefined;
  Household: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Browse"
        component={BrowseDiscoveryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="message-text" size={size} color={color} />
          ),
          tabBarBadge: undefined, // Will be dynamic based on unread count
        }}
      />
      <Tab.Screen
        name="Household"
        component={HouseholdScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
