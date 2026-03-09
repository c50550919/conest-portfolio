/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Response } from 'express';
import { z } from 'zod';
import { DeviceTokenModel } from '../../models/DeviceToken';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/errorHandler';

/**
 * Notification Controller
 *
 * Handles device token registration and removal for push notifications.
 * All endpoints require JWT authentication.
 */

const registerTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['ios', 'android']),
});

const deleteTokenSchema = z.object({
  token: z.string().min(1).max(500),
});

export const notificationController = {
  /**
   * Register a device token for push notifications.
   * Uses upsert: if the token already exists, ownership is transferred to the current user.
   *
   * POST /api/notifications/device-token
   * Body: { token: string, platform: 'ios' | 'android' }
   */
  registerDeviceToken: asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = registerTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await DeviceTokenModel.register(req.userId, parsed.data.token, parsed.data.platform);
    res.json({ success: true });
  }),

  /**
   * Remove a device token (e.g., on logout from a specific device).
   *
   * DELETE /api/notifications/device-token
   * Body: { token: string }
   */
  removeDeviceToken: asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = deleteTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    await DeviceTokenModel.deleteByToken(parsed.data.token);
    res.json({ success: true });
  }),
};
