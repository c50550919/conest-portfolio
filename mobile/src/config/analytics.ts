/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Analytics Configuration
 *
 * PostHog analytics configuration for event tracking and funnel analysis.
 * Analytics are disabled in development mode to avoid polluting production data.
 *
 * Reference: https://posthog.com/docs/libraries/react-native
 *
 * Created: 2026-03-06
 */

const POSTHOG_API_KEY = 'phc_not_configured';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export const analyticsConfig = {
  apiKey: POSTHOG_API_KEY,
  host: POSTHOG_HOST,
  enabled: !__DEV__, // Only track in production
};
