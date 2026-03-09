/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { notificationController } from './notification.controller';

/**
 * Notification Routes
 *
 * All routes require JWT authentication.
 *
 * Endpoints:
 * - POST   /api/notifications/device-token  - Register a device token
 * - DELETE  /api/notifications/device-token  - Remove a device token
 */

const router = Router();

// All notification routes require authentication
router.use(authenticateJWT);

router.post('/device-token', notificationController.registerDeviceToken);
router.delete('/device-token', notificationController.removeDeviceToken);

export default router;
