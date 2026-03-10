/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Session Management Service
 * Redis-based session management with device fingerprinting (ioredis)
 */

import crypto from 'crypto';
import { redis } from '../config/redis';
import logger from '../config/logger';
import { securityConfig } from '../config/security';

export interface SessionData {
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

/**
 * Initialize Redis client for sessions
 * @deprecated No longer needed - ioredis auto-connects. Kept for backwards compatibility.
 */
export async function initializeSessionRedis(): Promise<void> {
  // ioredis auto-connects, no initialization needed
  logger.debug('Session Redis initialization called (no-op with ioredis)');
}

/**
 * Generate device fingerprint from request metadata
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string,
  acceptLanguage?: string,
): string {
  const data = `${userAgent}|${ipAddress}|${acceptLanguage || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create new session
 */
export async function createSession(
  userId: string,
  deviceFingerprint: string,
  ipAddress: string,
  userAgent: string,
): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();
  const ttl = securityConfig.session.ttl;

  const sessionData: SessionData = {
    userId,
    deviceFingerprint,
    ipAddress,
    userAgent,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + ttl * 1000,
  };

  // Store session
  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));

  // Track user sessions
  await redis.sadd(`user:${userId}:sessions`, sessionId);

  // Enforce max concurrent sessions
  await enforceMaxSessions(userId);

  return sessionId;
}

/**
 * Get session data
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get(`session:${sessionId}`);

  if (!data) return null;

  const session: SessionData = JSON.parse(data);

  // Check if session is expired
  if (session.expiresAt < Date.now()) {
    await deleteSession(sessionId);
    return null;
  }

  // Extend session on activity if configured
  if (securityConfig.session.extendOnActivity) {
    await extendSession(sessionId);
  }

  return session;
}

/**
 * Update session last activity time
 */
export async function extendSession(sessionId: string): Promise<void> {
  const data = await redis.get(`session:${sessionId}`);
  if (!data) return;

  const session: SessionData = JSON.parse(data);
  const ttl = securityConfig.session.ttl;
  session.lastActivity = Date.now();
  session.expiresAt = Date.now() + ttl * 1000;

  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(session));
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const data = await redis.get(`session:${sessionId}`);
  if (data) {
    const session: SessionData = JSON.parse(data);
    await redis.srem(`user:${session.userId}:sessions`, sessionId);
  }

  await redis.del(`session:${sessionId}`);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  const sessionIds = await redis.smembers(`user:${userId}:sessions`);

  for (const sessionId of sessionIds) {
    await redis.del(`session:${sessionId}`);
  }

  await redis.del(`user:${userId}:sessions`);
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const sessionIds = await redis.smembers(`user:${userId}:sessions`);
  const sessions: SessionData[] = [];

  for (const sessionId of sessionIds) {
    const session = await getSession(sessionId);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Enforce maximum concurrent sessions per user
 */
async function enforceMaxSessions(userId: string): Promise<void> {
  const maxSessions = securityConfig.session.maxConcurrentSessions;
  const sessions = await getUserSessions(userId);

  if (sessions.length > maxSessions) {
    // Sort by last activity, oldest first
    sessions.sort((a, b) => a.lastActivity - b.lastActivity);

    // Remove oldest sessions
    const toRemove = sessions.slice(0, sessions.length - maxSessions);
    for (const _session of toRemove) {
      const sessionIds = await redis.smembers(`user:${userId}:sessions`);
      const oldestSessionId = sessionIds[0]; // Simplified - should match by session data
      if (oldestSessionId) {
        await deleteSession(oldestSessionId);
      }
    }
  }
}

/**
 * Validate session and device fingerprint
 */
export async function validateSession(
  sessionId: string,
  deviceFingerprint: string,
): Promise<boolean> {
  const session = await getSession(sessionId);

  if (!session) return false;

  // Verify device fingerprint if enabled
  if (securityConfig.session.deviceFingerprintEnabled) {
    if (session.deviceFingerprint !== deviceFingerprint) {
      return false;
    }
  }

  return true;
}

/**
 * Detect suspicious session activity
 */
export async function detectSuspiciousActivity(
  sessionId: string,
  currentIp: string,
  currentUserAgent: string,
): Promise<{
  suspicious: boolean;
  reasons: string[];
}> {
  const session = await getSession(sessionId);
  const reasons: string[] = [];

  if (!session) {
    return { suspicious: false, reasons: [] };
  }

  // Check for IP address change
  if (session.ipAddress !== currentIp) {
    reasons.push('IP address changed');
  }

  // Check for user agent change
  if (session.userAgent !== currentUserAgent) {
    reasons.push('User agent changed');
  }

  // Check for rapid session creation
  const timeSinceCreation = Date.now() - session.createdAt;
  if (timeSinceCreation < 60000) {
    // Less than 1 minute
    reasons.push('Session created very recently');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Cleanup expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  // Redis automatically removes expired keys, but we need to clean up user session sets
  const cleaned = 0;

  // This would need to iterate through all user session sets
  // For production, consider using Redis keyspace notifications

  return cleaned;
}
