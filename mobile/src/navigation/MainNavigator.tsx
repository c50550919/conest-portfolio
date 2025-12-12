/**
 * CoNest/SafeNest Main Navigator
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeNavigator from './HomeNavigator';
import { BrowseDiscoveryScreen } from '../screens/main/BrowseDiscoveryScreen';
import SavedProfilesScreen from '../screens/main/SavedProfilesScreen';
import MessagesNavigator from './MessagesNavigator';
import HouseholdScreen from '../screens/main/HouseholdScreen';
import ProfileNavigator from './ProfileNavigator';

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
        component={HouseholdScreen}
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
  );
};

export default MainNavigator;
