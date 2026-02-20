/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Comparison Feature Module
 *
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 * Unified comparison service supporting both discovery and saved profiles
 * with 6-dimension compatibility scoring.
 */

export { ProfileComparisonService, default as profileComparisonService } from './comparison.service';
export { compareProfiles, calculateCompatibility } from './comparison.controller';
export { default as comparisonRoutes } from './comparison.routes';
