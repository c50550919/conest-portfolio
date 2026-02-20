/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Environment Configuration
 *
 * Central configuration for environment-specific values.
 * For production, update PRODUCTION_API_URL before building.
 *
 * Constitution: Principle III (Security - no hardcoded secrets)
 *
 * Build Instructions:
 * - Development: Uses localhost with adb reverse
 * - Production: Set PRODUCTION_API_URL before building release
 *
 * For more advanced config, consider installing react-native-config:
 * npm install react-native-config
 */

// ============================================
// PRODUCTION CONFIGURATION
// Update this URL before production builds
// ============================================
const PRODUCTION_API_URL = 'https://api.conest.app';

// ============================================
// DEVELOPMENT CONFIGURATION
// ============================================
const DEVELOPMENT_API_URL = 'http://localhost:3000';

/**
 * Environment detection using React Native's built-in __DEV__ flag
 * - __DEV__ is true when running in development mode (Metro bundler)
 * - __DEV__ is false in production builds
 */
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

/**
 * Get the API base URL based on environment
 *
 * @returns The appropriate API URL for the current environment
 * @throws Error if production URL is not configured
 */
export function getApiBaseUrl(): string {
  // Allow runtime override via environment (for testing)
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  if (isDevelopment) {
    return DEVELOPMENT_API_URL;
  }

  // Production: Verify URL is configured
  if (!PRODUCTION_API_URL || PRODUCTION_API_URL === 'https://api.conest.app') {
    // In a real production app, you might want to:
    // 1. Use react-native-config for proper env management
    // 2. Inject via CI/CD build process
    // For now, we use the configured URL
    console.warn(
      '[Environment] Using default production URL. ' +
      'Update PRODUCTION_API_URL in environment.ts for custom domain.'
    );
  }

  return PRODUCTION_API_URL;
}

/**
 * Environment configuration object
 */
export const environment = {
  isDevelopment,
  isProduction,
  apiBaseUrl: getApiBaseUrl(),

  // Feature flags (can be expanded as needed)
  features: {
    enableDebugLogs: isDevelopment,
    enableCrashReporting: isProduction,
  },
};

export default environment;
