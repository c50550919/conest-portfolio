/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Mobile Push Notification Service
 *
 * Manages Firebase Cloud Messaging (FCM) lifecycle:
 * - Permission requests (iOS APNs prompt, Android 13+ POST_NOTIFICATIONS)
 * - Token registration with backend
 * - Token refresh handling
 * - Foreground / background message handlers
 *
 * Reference: https://rnfirebase.io/messaging/usage
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { notificationAPI } from './api/notificationAPI';

class MobilePushService {
  private currentToken: string | null = null;

  /**
   * Request push notification permission from the user.
   * iOS: Triggers the native APNs permission dialog.
   * Android 13+: Requests POST_NOTIFICATIONS runtime permission.
   * Android <13: Permission granted by default at install.
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android < 13: permission granted at install time
    return true;
  }

  /**
   * Request permission, obtain FCM token, and register with backend.
   * Skips registration if permission denied or token unchanged.
   */
  async registerToken(): Promise<void> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return;

      const token = await messaging().getToken();
      if (token && token !== this.currentToken) {
        const platform = Platform.OS as 'ios' | 'android';
        await notificationAPI.registerDeviceToken(token, platform);
        this.currentToken = token;
      }
    } catch (error) {
      console.warn('[PushService] Token registration failed:', error);
    }
  }

  /**
   * Remove the current device token from the backend (e.g., on logout).
   */
  async unregisterToken(): Promise<void> {
    if (this.currentToken) {
      try {
        await notificationAPI.removeDeviceToken(this.currentToken);
      } catch (error) {
        console.warn('[PushService] Token removal failed:', error);
      }
      this.currentToken = null;
    }
  }

  /**
   * Subscribe to token refresh events.
   * Returns an unsubscribe function for cleanup.
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    return messaging().onTokenRefresh(callback);
  }

  /**
   * Handle messages received while the app is in the foreground.
   * Returns an unsubscribe function for cleanup.
   */
  setupForegroundHandler(): () => void {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('[PushService] Foreground message:', remoteMessage.notification?.title);
    });
  }

  /**
   * Register the background/quit-state message handler.
   * Must be called outside of React component tree (e.g., index.js).
   */
  setupBackgroundHandler(): void {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[PushService] Background message:', remoteMessage.notification?.title);
    });
  }
}

export const mobilePushService = new MobilePushService();
