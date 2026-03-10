/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Connections Feature Module
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * Handles connection requests between users with:
 * - Rate limiting (5/day, 15/week)
 * - Encrypted messages at rest
 * - Real-time notifications via Socket.io
 * - Match creation on acceptance
 */

export {
  ConnectionRequestService,
  default as connectionRequestService,
} from './connection-request.service';
export {
  ConnectionRequestController,
  default as connectionRequestController,
} from './connection-request.controller';
export { default as connectionRequestRoutes } from './connection-request.routes';
