/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Canonical Entity Type Definitions - Single Source of Truth
 *
 * Purpose: Define all entity types in one place to prevent drift between layers
 * Convention: Database uses snake_case, API uses camelCase
 *
 * Each entity has:
 * - Database type (DB suffix) - matches database schema
 * - API type (no suffix) - used in API responses
 * - Transformation functions to convert between them
 *
 * Created: 2025-12-30
 */

export * from './user.entity';
export * from './parent.entity';
export * from './verification.entity';
export * from './message.entity';
export * from './connection-request.entity';
export * from './household.entity';
export * from './match.entity';
export * from './match-group.entity';
export * from './transformers';
