/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Unified Profile Comparison Validator
 *
 * Purpose: Validate comparison requests for unified comparison service
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 *
 * Created: 2025-10-20
 */

import { z } from 'zod';

/**
 * Profile source type schema
 */
const profileSourceTypeSchema = z.enum(['discovery', 'saved']);

/**
 * Single comparison request schema
 */
const comparisonRequestSchema = z.object({
  type: profileSourceTypeSchema,
  id: z.string().uuid('Invalid profile ID format'),
});

/**
 * Full comparison request body schema
 */
export const compareProfilesSchema = z.object({
  profiles: z
    .array(comparisonRequestSchema)
    .min(2, 'Must compare at least 2 profiles')
    .max(4, 'Cannot compare more than 4 profiles'),
});

/**
 * Type for validated comparison request
 */
export type CompareProfilesRequest = z.infer<typeof compareProfilesSchema>;
