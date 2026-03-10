/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Express type extensions
 * Adds custom properties to Express Request interface
 */

declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      email: string;
      role?: string;
      [key: string]: any;
    };
  }
}
