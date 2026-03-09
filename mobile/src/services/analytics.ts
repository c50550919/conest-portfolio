/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Analytics Service
 *
 * Lightweight wrapper around PostHog for event tracking, screen views,
 * and user identification. All calls are fire-and-forget to avoid
 * blocking the UI thread.
 *
 * Child Safety: NO child PII is ever sent to analytics.
 * Only aggregated, non-identifying data (e.g. event names, screen names).
 *
 * Reference: https://posthog.com/docs/libraries/react-native
 *
 * Created: 2026-03-06
 */

import PostHog from 'posthog-react-native';
import { analyticsConfig } from '../config/analytics';

let posthog: PostHog | null = null;

export const analytics = {
  async init(): Promise<void> {
    if (
      !analyticsConfig.enabled ||
      !analyticsConfig.apiKey.startsWith('phc_') ||
      analyticsConfig.apiKey === 'phc_not_configured'
    ) {
      console.log('[Analytics] Disabled (dev mode or unconfigured API key)');
      return;
    }

    try {
      posthog = new PostHog(analyticsConfig.apiKey, {
        host: analyticsConfig.host,
        enableSessionReplay: false,
      });
      console.log('[Analytics] PostHog initialized');
    } catch (error) {
      console.warn('[Analytics] Failed to initialize PostHog:', error);
    }
  },

  identify(userId: string, properties?: Record<string, any>): void {
    posthog?.identify(userId, properties);
  },

  track(event: string, properties?: Record<string, any>): void {
    posthog?.capture(event, properties);
  },

  screen(screenName: string, properties?: Record<string, any>): void {
    posthog?.screen(screenName, properties);
  },

  reset(): void {
    posthog?.reset();
  },

  async flush(): Promise<void> {
    await posthog?.flush();
  },
};

export const AnalyticsEvents = {
  // Auth funnel
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  OAUTH_STARTED: 'oauth_started',
  OAUTH_COMPLETED: 'oauth_completed',

  // Onboarding funnel
  ONBOARDING_LOCATION_SET: 'onboarding_location_set',
  ONBOARDING_BUDGET_SET: 'onboarding_budget_set',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Discovery & matching
  FIRST_DISCOVERY_VIEW: 'first_discovery_view',
  PROFILE_SWIPED: 'profile_swiped',
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_SAVED: 'profile_saved',

  // Connections
  CONNECTION_REQUESTED: 'connection_requested',
  CONNECTION_ACCEPTED: 'connection_accepted',
  CONNECTION_DECLINED: 'connection_declined',

  // Messaging
  MESSAGE_SENT: 'message_sent',

  // Verification
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',

  // Payments
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_COMPLETED: 'payment_completed',
  SUBSCRIPTION_STARTED: 'subscription_started',

  // Household
  HOUSEHOLD_CREATED: 'household_created',
  HOUSEHOLD_INVITE_SENT: 'household_invite_sent',
} as const;
