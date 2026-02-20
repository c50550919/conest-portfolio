/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Feature Module
 *
 * Barrel file exporting all household feature components.
 */

export { HouseholdService } from './household.service';
export { HouseholdController } from './household.controller';
export { default as householdRoutes } from './household.routes';

// Templates sub-feature
export { TemplatesService } from './templates.service';
export { TemplatesController } from './templates.controller';
export { default as templatesRoutes } from './templates.routes';
