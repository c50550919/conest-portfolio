/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Notification API Client
 *
 * Registers and removes device push tokens with the backend.
 *
 * Endpoints:
 * - POST /api/notifications/device-token  - Register FCM/APNs token
 * - DELETE /api/notifications/device-token - Remove token on logout
 *
 * Security:
 * - All endpoints require JWT authentication (handled by apiClient interceptor)
 */

import apiClient from '../../config/api';

export const notificationAPI = {
  async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    await apiClient.post('/api/notifications/device-token', { token, platform });
  },

  async removeDeviceToken(token: string): Promise<void> {
    await apiClient.delete('/api/notifications/device-token', { data: { token } });
  },
};
