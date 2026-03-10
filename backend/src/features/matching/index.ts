/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Matching Feature Module
 *
 * FHA-compliant pairing/matching service with neutral compatibility scoring.
 * Uses preference-based factors only (no family composition scoring).
 */

export { PairingService, MatchingService } from './matching.service';
export { matchController } from './matching.controller';
export { default as matchRoutes } from './matching.routes';
