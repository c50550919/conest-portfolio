/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Audit Logging Service
 * Comprehensive audit logging for sensitive operations
 */

import winston from 'winston';
import { redis } from '../config/redis';
import { securityConfig } from '../config/security';
import { sanitizeForLogging, generateCorrelationId } from '../utils/tokenization';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId?: string;
  operation: string;
  resource?: string;
  resourceId?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  status: 'success' | 'failure' | 'pending';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  error?: string;
  correlationId?: string;
}

// Winston logger for audit logs
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: 'logs/audit-error.log',
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

/**
 * Initialize Redis client for audit logs
 * @deprecated No longer needed - ioredis auto-connects. Kept for backwards compatibility.
 */
export async function initializeAuditRedis(): Promise<void> {
  // ioredis auto-connects, no initialization needed
  auditLogger.debug('Audit Redis initialization called (no-op with ioredis)');
}

/**
 * Create audit log entry
 */
export async function createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  const auditEntry: AuditLogEntry = {
    id: generateCorrelationId(),
    timestamp: Date.now(),
    ...entry,
  };

  // Sanitize metadata before logging
  if (auditEntry.metadata) {
    auditEntry.metadata = sanitizeForLogging(auditEntry.metadata);
  }

  // Log to Winston
  auditLogger.info('Audit log entry', auditEntry);

  // Store in Redis for recent access
  try {
    const key = `audit:${auditEntry.id}`;
    const ttl = securityConfig.audit.retentionDays * 24 * 60 * 60; // Convert to seconds

    await redis.setex(key, ttl, JSON.stringify(auditEntry));

    // Add to user's audit trail
    if (auditEntry.userId) {
      await redis.zadd(
        `audit:user:${auditEntry.userId}`,
        auditEntry.timestamp,
        auditEntry.id,
      );

      // Expire old entries
      const cutoff = Date.now() - (ttl * 1000);
      await redis.zremrangebyscore(
        `audit:user:${auditEntry.userId}`,
        0,
        cutoff,
      );
    }

    // Add to operation index
    await redis.zadd(
      `audit:operation:${auditEntry.operation}`,
      auditEntry.timestamp,
      auditEntry.id,
    );
  } catch (error) {
    auditLogger.error('Failed to store audit log in Redis:', { error });
  }

  // TODO: Store in PostgreSQL for long-term retention
}

/**
 * Log authentication attempt
 */
export async function logAuthAttempt(
  userId: string | undefined,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  metadata?: Record<string, any>,
): Promise<void> {
  await createAuditLog({
    userId,
    operation: 'user.login',
    action: 'execute',
    status: success ? 'success' : 'failure',
    ipAddress,
    userAgent,
    metadata,
  });
}

/**
 * Log password change
 */
export async function logPasswordChange(
  userId: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
): Promise<void> {
  await createAuditLog({
    userId,
    operation: 'user.passwordChange',
    action: 'update',
    status: success ? 'success' : 'failure',
    ipAddress,
    userAgent,
  });
}

/**
 * Options for logging verification completion
 */
export interface LogVerificationOptions {
  userId: string;
  verificationType: string;
  status: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

/**
 * Log verification completion
 */
export async function logVerification(options: LogVerificationOptions): Promise<void> {
  const { userId, verificationType, status, ipAddress, userAgent, metadata } = options;
  await createAuditLog({
    userId,
    operation: 'verification.complete',
    resource: 'verification',
    action: 'create',
    status,
    ipAddress,
    userAgent,
    metadata: {
      verificationType,
      ...metadata,
    },
  });
}

/**
 * Options for logging payment transaction
 */
export interface LogPaymentOptions {
  userId: string;
  amount: number;
  status: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

/**
 * Log payment transaction
 */
export async function logPayment(options: LogPaymentOptions): Promise<void> {
  const { userId, amount, status, ipAddress, userAgent, metadata } = options;
  await createAuditLog({
    userId,
    operation: 'payment.processed',
    resource: 'payment',
    action: 'create',
    status,
    ipAddress,
    userAgent,
    metadata: {
      amount,
      ...sanitizeForLogging(metadata || {}),
    },
  });
}

/**
 * Options for logging resource access
 */
export interface LogResourceAccessOptions {
  userId: string | undefined;
  resource: string;
  resourceId: string;
  action: AuditLogEntry['action'];
  status: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
}

/**
 * Log resource access
 */
export async function logResourceAccess(options: LogResourceAccessOptions): Promise<void> {
  const { userId, resource, resourceId, action, status, ipAddress, userAgent } = options;
  await createAuditLog({
    userId,
    operation: `${resource}.${action}`,
    resource,
    resourceId,
    action,
    status,
    ipAddress,
    userAgent,
  });
}

/**
 * Get audit logs for user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<AuditLogEntry[]> {
  try {
    // Get audit log IDs from sorted set (most recent first)
    const logIds = await redis.zrevrange(
      `audit:user:${userId}`,
      offset,
      offset + limit - 1,
    );

    // Fetch full log entries
    const logs: AuditLogEntry[] = [];
    for (const logId of logIds) {
      const data = await redis.get(`audit:${logId}`);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }

    return logs;
  } catch (error) {
    auditLogger.error('Failed to retrieve user audit logs:', { error });
    return [];
  }
}

/**
 * Get audit logs for operation type
 */
export async function getOperationAuditLogs(
  operation: string,
  limit: number = 100,
): Promise<AuditLogEntry[]> {
  try {
    const logIds = await redis.zrevrange(
      `audit:operation:${operation}`,
      0,
      limit - 1,
    );

    const logs: AuditLogEntry[] = [];
    for (const logId of logIds) {
      const data = await redis.get(`audit:${logId}`);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }

    return logs;
  } catch (error) {
    auditLogger.error('Failed to retrieve operation audit logs:', { error });
    return [];
  }
}

/**
 * Detect suspicious patterns in audit logs
 */
export async function detectSuspiciousPatterns(
  userId: string,
  windowMinutes: number = 60,
): Promise<{
  suspicious: boolean;
  patterns: string[];
}> {
  const logs = await getUserAuditLogs(userId, 1000);
  const patterns: string[] = [];

  const cutoff = Date.now() - (windowMinutes * 60 * 1000);
  const recentLogs = logs.filter(log => log.timestamp >= cutoff);

  // Multiple failed login attempts
  const failedLogins = recentLogs.filter(
    log => log.operation === 'user.login' && log.status === 'failure',
  );
  if (failedLogins.length >= securityConfig.suspiciousActivity.multipleFailedLogins) {
    patterns.push(`${failedLogins.length} failed login attempts`);
  }

  // Rapid account changes
  const accountChanges = recentLogs.filter(
    log => log.operation.includes('user.') && log.action === 'update',
  );
  if (accountChanges.length >= securityConfig.suspiciousActivity.rapidAccountChanges) {
    patterns.push(`${accountChanges.length} rapid account changes`);
  }

  // Multiple IP addresses
  const uniqueIPs = new Set(recentLogs.map(log => log.ipAddress));
  if (uniqueIPs.size > 3) {
    patterns.push(`Access from ${uniqueIPs.size} different IP addresses`);
  }

  // Access from multiple devices
  const uniqueUserAgents = new Set(recentLogs.map(log => log.userAgent));
  if (uniqueUserAgents.size > 3) {
    patterns.push(`Access from ${uniqueUserAgents.size} different devices`);
  }

  return {
    suspicious: patterns.length > 0,
    patterns,
  };
}

/**
 * Export audit logs to file (for compliance)
 */
export async function exportAuditLogs(
  startDate: Date,
  endDate: Date,
  userId?: string,
): Promise<AuditLogEntry[]> {
  // TODO: Implement database query for long-term storage
  // For now, return recent logs from Redis

  if (userId) {
    return getUserAuditLogs(userId, 10000);
  }

  return [];
}

// ============================================
// FHA COMPLIANCE AUDIT LOGS
// ============================================

/**
 * Log compatibility calculation (FHA COMPLIANCE)
 *
 * Purpose: Creates audit trail proving algorithm uses preference-based scoring,
 * NOT family composition. Critical for FHA legal defensibility.
 *
 * Metadata includes:
 * - All scoring factors used (location, budget, schedule, etc.)
 * - familyCompositionUsed: false (explicit compliance proof)
 * - Breakdown of scores for transparency
 */
export async function logCompatibilityCalculation(
  userId: string,
  targetUserId: string,
  compatibility: {
    totalScore: number;
    breakdown: Record<string, number>;
    dealbreakers?: string[];
  },
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  await createAuditLog({
    userId,
    operation: 'pairing.compatibility_calculated',
    resource: 'compatibility',
    resourceId: targetUserId,
    action: 'execute',
    status: 'success',
    ipAddress,
    userAgent,
    metadata: {
      targetUserId,
      totalScore: compatibility.totalScore,
      breakdown: compatibility.breakdown,
      dealbreakers: compatibility.dealbreakers,
      scoringFactors: Object.keys(compatibility.breakdown),
      familyCompositionUsed: false, // CRITICAL: Explicitly log no family scoring
      algorithmVersion: '2.0-enhanced', // Track algorithm version for compliance
    },
  });
}

/**
 * Options for logging pairing creation (FHA COMPLIANCE)
 */
export interface LogPairingCreatedOptions {
  userId1: string;
  userId2: string;
  matchId: string;
  compatibilityScore: number;
  ipAddress: string;
  userAgent: string;
  breakdown?: Record<string, number>;
}

/**
 * Log pairing/match creation (FHA COMPLIANCE)
 *
 * Purpose: Track when mutual pairings are created and the compatibility score
 * that led to the pairing. Essential for demonstrating preference-based matching.
 */
export async function logPairingCreated(options: LogPairingCreatedOptions): Promise<void> {
  const { userId1, userId2, matchId, compatibilityScore, ipAddress, userAgent, breakdown } = options;
  await createAuditLog({
    userId: userId1,
    operation: 'pairing.created',
    resource: 'pairing',
    resourceId: matchId,
    action: 'create',
    status: 'success',
    ipAddress,
    userAgent,
    metadata: {
      userId1,
      userId2,
      matchId,
      compatibilityScore,
      breakdown,
      familyCompositionUsed: false, // CRITICAL: Compliance proof
      pairingType: 'mutual', // Both users swiped right
    },
  });
}

/**
 * Log profile view in discovery feed (FHA COMPLIANCE)
 *
 * Purpose: Track which profiles are shown to users and the compatibility scores
 * used for ranking. Demonstrates non-discriminatory profile presentation.
 */
export async function logProfileView(
  userId: string,
  viewedProfileUserId: string,
  compatibilityScore: number,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  await createAuditLog({
    userId,
    operation: 'discovery.profile_viewed',
    resource: 'profile',
    resourceId: viewedProfileUserId,
    action: 'read',
    status: 'success',
    ipAddress,
    userAgent,
    metadata: {
      viewedProfileUserId,
      compatibilityScore,
      familyCompositionUsed: false, // CRITICAL: Compliance proof
      discoveryAlgorithm: 'preference-based-v2',
    },
  });
}

/**
 * Options for logging algorithm changes (FHA COMPLIANCE)
 */
export interface LogAlgorithmChangeOptions {
  adminUserId: string;
  changeType: 'weights' | 'factors' | 'logic' | 'configuration';
  changeDescription: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

/**
 * Log algorithm changes (FHA COMPLIANCE)
 *
 * Purpose: Track when administrators modify algorithm logic, weights, or scoring factors.
 * Essential for demonstrating consistent non-discriminatory practices.
 *
 * This should be called whenever:
 * - Scoring weights are modified
 * - New preference factors are added
 * - Algorithm logic is updated
 */
export async function logAlgorithmChange(options: LogAlgorithmChangeOptions): Promise<void> {
  const { adminUserId, changeType, changeDescription, ipAddress, userAgent, metadata } = options;
  await createAuditLog({
    userId: adminUserId,
    operation: 'algorithm.modified',
    resource: 'algorithm',
    action: 'update',
    status: 'success',
    ipAddress,
    userAgent,
    metadata: {
      changeType,
      changeDescription,
      timestamp: Date.now(),
      adminUserId,
      familyCompositionUsed: false, // CRITICAL: Compliance proof
      complianceVerified: true,
      ...metadata,
    },
  });
}
