/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Messages Navigator
 * Stack navigation for enhanced messaging system
 *
 * Screens:
 * - ConversationsList: All conversations with verification badges
 * - Chat: Individual chat interface with real-time messaging
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ConversationsListScreen from '../screens/messaging/ConversationsListScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

export type MessagesStackParamList = {
  ConversationsList: undefined;
  Chat: {
    conversationId: string;
    participantId: string;
    participantName: string;
    participantVerified: boolean;
  };
  ProfileDetails: {
    userId: string;
  };
};

const Stack = createStackNavigator<MessagesStackParamList>();

const MessagesNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
};

export default MessagesNavigator;
