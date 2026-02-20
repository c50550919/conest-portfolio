/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
// Admin feature barrel file
export {
  adminController,
  verificationReviewController,
  moderationController,
  calculateSLARemaining,
  default as adminControllerDefault,
} from './admin.controller';
export { default as adminRoutes } from './admin.routes';
