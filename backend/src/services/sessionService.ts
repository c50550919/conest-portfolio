/**
 * Session Management Service
 * Redis-based session management with device fingerprinting
 */

import { createClient } from 'redis';
import crypto from 'crypto';
import { securityConfig } from '../config/security';

let redisClient: ReturnType<typeof createClient> | null = null;

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
 */
export async function initializeSessionRedis(): Promise<void> {
  if (redisClient) return;

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => {
    console.error('Redis session client error:', err);
  });

  await redisClient.connect();
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
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

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
    expiresAt: now + (ttl * 1000),
  };

  // Store session
  await redisClient.setEx(
    `session:${sessionId}`,
    ttl,
    JSON.stringify(sessionData),
  );

  // Track user sessions
  await redisClient.sAdd(`user:${userId}:sessions`, sessionId);

  // Enforce max concurrent sessions
  await enforceMaxSessions(userId);

  return sessionId;
}

/**
 * Get session data
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  const data = await redisClient.get(`session:${sessionId}`);

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
  if (!redisClient) return;

  const session = await getSession(sessionId);
  if (!session) return;

  const ttl = securityConfig.session.ttl;
  session.lastActivity = Date.now();
  session.expiresAt = Date.now() + (ttl * 1000);

  await redisClient.setEx(
    `session:${sessionId}`,
    ttl,
    JSON.stringify(session),
  );
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!redisClient) return;

  const session = await getSession(sessionId);
  if (session) {
    await redisClient.sRem(`user:${session.userId}:sessions`, sessionId);
  }

  await redisClient.del(`session:${sessionId}`);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  if (!redisClient) return;

  const sessionIds = await redisClient.sMembers(`user:${userId}:sessions`);

  for (const sessionId of sessionIds) {
    await redisClient.del(`session:${sessionId}`);
  }

  await redisClient.del(`user:${userId}:sessions`);
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  if (!redisClient) return [];

  const sessionIds = await redisClient.sMembers(`user:${userId}:sessions`);
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
  if (!redisClient) return;

  const maxSessions = securityConfig.session.maxConcurrentSessions;
  const sessions = await getUserSessions(userId);

  if (sessions.length > maxSessions) {
    // Sort by last activity, oldest first
    sessions.sort((a, b) => a.lastActivity - b.lastActivity);

    // Remove oldest sessions
    const toRemove = sessions.slice(0, sessions.length - maxSessions);
    for (const _session of toRemove) {
      const sessionIds = await redisClient.sMembers(`user:${userId}:sessions`);
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
  if (timeSinceCreation < 60000) { // Less than 1 minute
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
  if (!redisClient) return 0;

  // Redis automatically removes expired keys, but we need to clean up user session sets
  const cleaned = 0;

  // This would need to iterate through all user session sets
  // For production, consider using Redis keyspace notifications

  return cleaned;
}
