/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Rate Limit Enforcement Utilities
 *
 * Purpose: Client-side rate limiting for connection requests, saved profiles, and viewing
 * Constitution: Principle I (Child Safety - prevent harassment)
 *
 * Features:
 * - Connection request limits (daily, weekly, monthly, pending)
 * - Saved profile quota tracking
 * - Same-person cooldown tracking
 * - User-friendly error messages
 *
 * Created: 2025-10-08
 */

import {
  CONNECTION_REQUEST_LIMITS,
  SAVED_PROFILE_LIMITS,
  VIEWING_LIMITS,
  ERROR_MESSAGES,
} from '../config/discoveryConfig';
import { ConnectionRequest, SavedProfile } from '../types/discovery';

// ============================================================================
// Connection Request Rate Limiting
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  errorMessage?: string;
  resetsAt?: string; // ISO timestamp
  remaining?: number;
}

/**
 * Check if user can send a connection request
 */
export function canSendConnectionRequest(
  sentRequests: ConnectionRequest[],
  targetUserId: string
): RateLimitResult {
  const now = new Date();

  // Check 1: Daily limit (5 per day)
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const requestsLast24h = sentRequests.filter((r) => new Date(r.sentAt) >= last24Hours);

  if (requestsLast24h.length >= CONNECTION_REQUEST_LIMITS.maxPerDay) {
    const oldestRequest = requestsLast24h.sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    )[0];
    const resetsAt = new Date(
      new Date(oldestRequest.sentAt).getTime() + 24 * 60 * 60 * 1000
    ).toISOString();

    const hoursUntilReset = Math.ceil(
      (new Date(resetsAt).getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    return {
      allowed: false,
      reason: 'daily_limit',
      errorMessage: `${ERROR_MESSAGES.CONNECTION_LIMIT_DAILY} (resets in ${hoursUntilReset}h)`,
      resetsAt,
      remaining: 0,
    };
  }

  // Check 2: Weekly limit (15 per week)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const requestsLast7Days = sentRequests.filter((r) => new Date(r.sentAt) >= last7Days);

  if (requestsLast7Days.length >= CONNECTION_REQUEST_LIMITS.maxPerWeek) {
    return {
      allowed: false,
      reason: 'weekly_limit',
      errorMessage: ERROR_MESSAGES.CONNECTION_LIMIT_WEEKLY,
    };
  }

  // Check 3: Monthly limit (40 per month)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const requestsLast30Days = sentRequests.filter((r) => new Date(r.sentAt) >= last30Days);

  if (requestsLast30Days.length >= CONNECTION_REQUEST_LIMITS.maxPerMonth) {
    return {
      allowed: false,
      reason: 'monthly_limit',
      errorMessage: "You've reached your monthly limit of 40 connection requests.",
    };
  }

  // Check 4: Max pending requests (10)
  const pendingRequests = sentRequests.filter((r) => r.status === 'pending');

  if (pendingRequests.length >= CONNECTION_REQUEST_LIMITS.maxPending) {
    return {
      allowed: false,
      reason: 'pending_limit',
      errorMessage: ERROR_MESSAGES.CONNECTION_LIMIT_PENDING,
    };
  }

  // Check 5: Same-person cooldown (7 days)
  const requestsToTarget = sentRequests.filter((r) => r.targetUserId === targetUserId);

  if (requestsToTarget.length > 0) {
    const lastRequest = requestsToTarget.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    )[0];

    const cooldownEnds = new Date(
      new Date(lastRequest.sentAt).getTime() +
        CONNECTION_REQUEST_LIMITS.samePersonCooldownDays * 24 * 60 * 60 * 1000
    );

    if (now < cooldownEnds) {
      const daysRemaining = Math.ceil(
        (cooldownEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        allowed: false,
        reason: 'cooldown',
        errorMessage: ERROR_MESSAGES.CONNECTION_COOLDOWN.replace(
          '{days}',
          daysRemaining.toString()
        ),
        resetsAt: cooldownEnds.toISOString(),
      };
    }
  }

  // All checks passed - allow request
  return {
    allowed: true,
    remaining: CONNECTION_REQUEST_LIMITS.maxPerDay - requestsLast24h.length,
  };
}

/**
 * Validate connection request message length
 */
export function validateConnectionMessage(message: string): RateLimitResult {
  const trimmed = message.trim();

  if (trimmed.length < CONNECTION_REQUEST_LIMITS.minMessageLength) {
    return {
      allowed: false,
      reason: 'message_too_short',
      errorMessage: ERROR_MESSAGES.MESSAGE_TOO_SHORT,
    };
  }

  if (trimmed.length > CONNECTION_REQUEST_LIMITS.maxMessageLength) {
    return {
      allowed: false,
      reason: 'message_too_long',
      errorMessage: ERROR_MESSAGES.MESSAGE_TOO_LONG,
    };
  }

  return { allowed: true };
}

/**
 * Get connection request statistics
 */
export function getConnectionRequestStats(sentRequests: ConnectionRequest[]): {
  usedToday: number;
  usedThisWeek: number;
  usedThisMonth: number;
  pending: number;
  maxPerDay: number;
  maxPerWeek: number;
  maxPerMonth: number;
  maxPending: number;
} {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    usedToday: sentRequests.filter((r) => new Date(r.sentAt) >= last24Hours).length,
    usedThisWeek: sentRequests.filter((r) => new Date(r.sentAt) >= last7Days).length,
    usedThisMonth: sentRequests.filter((r) => new Date(r.sentAt) >= last30Days).length,
    pending: sentRequests.filter((r) => r.status === 'pending').length,
    maxPerDay: CONNECTION_REQUEST_LIMITS.maxPerDay,
    maxPerWeek: CONNECTION_REQUEST_LIMITS.maxPerWeek,
    maxPerMonth: CONNECTION_REQUEST_LIMITS.maxPerMonth,
    maxPending: CONNECTION_REQUEST_LIMITS.maxPending,
  };
}

// ============================================================================
// Saved Profiles Quota Management
// ============================================================================

/**
 * Check if user can save another profile
 */
export function canSaveProfile(savedProfiles: SavedProfile[]): RateLimitResult {
  const currentCount = savedProfiles.filter((p) => p.folder !== 'archived').length;

  // Hard limit check
  if (currentCount >= SAVED_PROFILE_LIMITS.total) {
    return {
      allowed: false,
      reason: 'saved_limit',
      errorMessage: ERROR_MESSAGES.SAVED_PROFILE_LIMIT,
    };
  }

  // Soft warning check
  if (currentCount >= SAVED_PROFILE_LIMITS.softWarningAt) {
    return {
      allowed: true,
      reason: 'soft_warning',
      errorMessage: ERROR_MESSAGES.SAVED_PROFILE_WARNING.replace(
        '{count}',
        currentCount.toString()
      ),
      remaining: SAVED_PROFILE_LIMITS.total - currentCount,
    };
  }

  return {
    allowed: true,
    remaining: SAVED_PROFILE_LIMITS.total - currentCount,
  };
}

/**
 * Get saved profiles statistics
 */
export function getSavedProfileStats(savedProfiles: SavedProfile[]): {
  total: number;
  byFolder: Record<string, number>;
  limit: number;
  remaining: number;
  percentUsed: number;
  oldProfiles: number; // Saved 60+ days ago
} {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const active = savedProfiles.filter((p) => p.folder !== 'archived');

  return {
    total: active.length,
    byFolder: {
      'top-choice': savedProfiles.filter((p) => p.folder === 'top-choice').length,
      'strong-maybe': savedProfiles.filter((p) => p.folder === 'strong-maybe').length,
      considering: savedProfiles.filter((p) => p.folder === 'considering').length,
      backup: savedProfiles.filter((p) => p.folder === 'backup').length,
      archived: savedProfiles.filter((p) => p.folder === 'archived').length,
    },
    limit: SAVED_PROFILE_LIMITS.total,
    remaining: SAVED_PROFILE_LIMITS.total - active.length,
    percentUsed: Math.round((active.length / SAVED_PROFILE_LIMITS.total) * 100),
    oldProfiles: savedProfiles.filter((p) => new Date(p.savedAt) < sixtyDaysAgo).length,
  };
}

/**
 * Get profiles suggested for archiving
 */
export function getArchiveSuggestions(savedProfiles: SavedProfile[]): SavedProfile[] {
  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() - SAVED_PROFILE_LIMITS.suggestArchiveAfterDays * 24 * 60 * 60 * 1000
  );

  return savedProfiles
    .filter(
      (p) => p.folder !== 'archived' && new Date(p.savedAt) < cutoffDate && p.viewCount <= 2 // Haven't viewed much
    )
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
}

// ============================================================================
// Request Expiration Management
// ============================================================================

/**
 * Check if connection request is expiring soon
 */
export function isRequestExpiringSoon(request: ConnectionRequest): boolean {
  const now = new Date();
  const expiresAt = new Date(request.expiresAt);
  const daysUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return (
    request.status === 'pending' &&
    daysUntilExpiration <= CONNECTION_REQUEST_LIMITS.expirationWarningDays &&
    daysUntilExpiration > 0
  );
}

/**
 * Get days remaining until request expires
 */
export function getDaysUntilExpiration(request: ConnectionRequest): number {
  const now = new Date();
  const expiresAt = new Date(request.expiresAt);
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Filter out expired requests
 */
export function filterExpiredRequests(requests: ConnectionRequest[]): ConnectionRequest[] {
  const now = new Date();
  return requests.filter((r) => new Date(r.expiresAt) > now || r.status !== 'pending');
}

// ============================================================================
// Viewing Limits (Anti-Scraping)
// ============================================================================

interface ProfileView {
  profileId: string;
  viewedAt: string;
  detailedView: boolean;
}

/**
 * Check if user is within viewing limits
 */
export function canViewProfile(
  recentViews: ProfileView[],
  isDetailedView: boolean
): RateLimitResult {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check hourly limit
  const viewsLastHour = recentViews.filter((v) => new Date(v.viewedAt) >= oneHourAgo);

  if (viewsLastHour.length >= VIEWING_LIMITS.maxProfileViewsPerHour) {
    return {
      allowed: false,
      reason: 'hourly_viewing_limit',
      errorMessage: ERROR_MESSAGES.VIEWING_LIMIT,
    };
  }

  // Check daily detailed view limit
  if (isDetailedView) {
    const detailedViewsToday = recentViews.filter(
      (v) => v.detailedView && new Date(v.viewedAt) >= oneDayAgo
    );

    if (detailedViewsToday.length >= VIEWING_LIMITS.maxDetailedViewsPerDay) {
      return {
        allowed: false,
        reason: 'daily_detailed_viewing_limit',
        errorMessage: ERROR_MESSAGES.VIEWING_LIMIT,
      };
    }
  }

  return { allowed: true };
}
