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
