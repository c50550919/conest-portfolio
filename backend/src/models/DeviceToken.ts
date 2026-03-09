/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { db } from '../config/database';

/**
 * DeviceToken Model
 *
 * Stores push notification device tokens for iOS (APNs) and Android (FCM).
 * Each physical device has one token; re-registration updates the existing row.
 *
 * Constitution Principle III: Security
 * - Device tokens are tied to authenticated users only
 * - CASCADE delete ensures cleanup when user is removed
 */

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  last_used_at: Date;
  created_at: Date;
  updated_at: Date;
}

export const DeviceTokenModel = {
  /**
   * Register or update a device token.
   * Uses upsert: if the token already exists, update its user/platform/timestamp.
   * This handles device transfer between accounts and app reinstalls.
   */
  async register(userId: string, token: string, platform: 'ios' | 'android'): Promise<DeviceToken> {
    const [result] = await db('device_tokens')
      .insert({
        user_id: userId,
        token,
        platform,
        last_used_at: db.fn.now(),
      })
      .onConflict('token')
      .merge({
        user_id: userId,
        platform,
        last_used_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return result;
  },

  /**
   * Find all device tokens for a user (supports multi-device).
   */
  async findByUserId(userId: string): Promise<DeviceToken[]> {
    return db('device_tokens').where({ user_id: userId });
  },

  /**
   * Remove a specific device token (e.g., on logout from one device).
   */
  async deleteByToken(token: string): Promise<void> {
    await db('device_tokens').where({ token }).delete();
  },

  /**
   * Remove all device tokens for a user (e.g., on account deletion or full logout).
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db('device_tokens').where({ user_id: userId }).delete();
  },
};
