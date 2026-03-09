/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */

/**
 * Push Notification Service (Firebase Cloud Messaging)
 *
 * Sends push notifications to user devices via FCM.
 * Handles multi-device delivery, invalid token cleanup, and graceful degradation.
 *
 * All calls are fire-and-forget: failures are logged but never propagated.
 *
 * Reference: https://firebase.google.com/docs/cloud-messaging
 */

import * as admin from 'firebase-admin';
import { DeviceTokenModel } from '../models/DeviceToken';
import logger from '../config/logger';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class PushNotificationService {
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return;
    }

    try {
      const { getEnv } = require('../config/env');
      const env = getEnv();

      if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        logger.warn('[PushNotificationService] FIREBASE_SERVICE_ACCOUNT_PATH not set, push disabled');
        return;
      }

      const serviceAccount = require(env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.initialized = true;
    } catch (error: any) {
      logger.error('[PushNotificationService] Firebase init failed:', error.message);
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await DeviceTokenModel.findByUserId(userId);
    if (tokens.length === 0) return;

    this.ensureInitialized();
    if (!this.initialized) return;

    const tokenStrings = tokens.map((t) => t.token);

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: tokenStrings,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data,
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'conest_default',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokenStrings[idx]);
          }
        });
        for (const token of invalidTokens) {
          await DeviceTokenModel.deleteByToken(token);
        }
      }
    } catch (error: any) {
      logger.error('[PushNotificationService] Send failed:', {
        userId,
        error: error.message,
        tokenCount: tokenStrings.length,
      });
    }
  }
}

// Singleton
let instance: PushNotificationService | null = null;

export function getPushService(): PushNotificationService {
  if (!instance) {
    instance = new PushNotificationService();
  }
  return instance;
}
