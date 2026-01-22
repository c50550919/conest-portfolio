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
