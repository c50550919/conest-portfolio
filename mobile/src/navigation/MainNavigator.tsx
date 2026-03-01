/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest/SafeNest Main Navigator
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeNavigator from './HomeNavigator';
import { BrowseDiscoveryScreen } from '../screens/main/BrowseDiscoveryScreen';
import SavedProfilesScreen from '../screens/main/SavedProfilesScreen';
import MessagesNavigator from './MessagesNavigator';
import HouseholdNavigator from './HouseholdNavigator';
import ProfileNavigator from './ProfileNavigator';

import ErrorBoundary from '../components/common/ErrorBoundary';
import { theme } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Saved: undefined;
  Messages: undefined;
  Household: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 56 + insets.bottom : 64;

  return (
    <ErrorBoundary fallbackMessage="A screen crashed. Tap retry to recover.">
      <Tab.Navigator
        screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 6,
          paddingHorizontal: 4,
          // Add subtle shadow for depth
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        tabBarTestID: 'tab-bar',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarTestID: 'tab-home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={BrowseDiscoveryScreen}
        options={{
          tabBarTestID: 'tab-discover',
          tabBarAccessibilityLabel: 'Discover',
          tabBarIcon: ({ color, size }) => <Icon name="home-search" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedProfilesScreen}
        options={{
          tabBarTestID: 'tab-saved',
          tabBarAccessibilityLabel: 'Saved Profiles',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bookmark-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesNavigator}
        options={{
          tabBarTestID: 'tab-messages',
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: ({ color, size }) => <Icon name="message-text" size={size} color={color} />,
          tabBarBadge: undefined, // Will be dynamic based on unread count
        }}
      />
      <Tab.Screen
        name="Household"
        component={HouseholdNavigator}
        options={{
          tabBarTestID: 'tab-household',
          tabBarAccessibilityLabel: 'Household',
          tabBarIcon: ({ color, size }) => <Icon name="home-group" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarTestID: 'tab-profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Icon name="account-circle" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
    </ErrorBoundary>
  );
};

export default MainNavigator;
