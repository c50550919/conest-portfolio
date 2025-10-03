/**
 * Audit Logging Service
 * Comprehensive audit logging for sensitive operations
 */

import { createClient } from 'redis';
import winston from 'winston';
import { securityConfig } from '../config/security';
import { sanitizeForLogging, generateCorrelationId } from '../utils/tokenization';

let redisClient: ReturnType<typeof createClient> | null = null;

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
    winston.format.json()
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
 */
export async function initializeAuditRedis(): Promise<void> {
  if (redisClient) return;

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => {
    console.error('Redis audit client error:', err);
  });

  await redisClient.connect();
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
  if (redisClient) {
    try {
      const key = `audit:${auditEntry.id}`;
      const ttl = securityConfig.audit.retentionDays * 24 * 60 * 60; // Convert to seconds

      await redisClient.setEx(key, ttl, JSON.stringify(auditEntry));

      // Add to user's audit trail
      if (auditEntry.userId) {
        await redisClient.zAdd(`audit:user:${auditEntry.userId}`, {
          score: auditEntry.timestamp,
          value: auditEntry.id,
        });

        // Expire old entries
        const cutoff = Date.now() - (ttl * 1000);
        await redisClient.zRemRangeByScore(
          `audit:user:${auditEntry.userId}`,
          0,
          cutoff
        );
      }

      // Add to operation index
      await redisClient.zAdd(`audit:operation:${auditEntry.operation}`, {
        score: auditEntry.timestamp,
        value: auditEntry.id,
      });
    } catch (error) {
      console.error('Failed to store audit log in Redis:', error);
    }
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
  metadata?: Record<string, any>
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
  success: boolean
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
 * Log verification completion
 */
export async function logVerification(
  userId: string,
  verificationType: string,
  status: 'success' | 'failure',
  ipAddress: string,
  userAgent: string,
  metadata?: Record<string, any>
): Promise<void> {
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
 * Log payment transaction
 */
export async function logPayment(
  userId: string,
  amount: number,
  status: 'success' | 'failure',
  ipAddress: string,
  userAgent: string,
  metadata?: Record<string, any>
): Promise<void> {
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
 * Log resource access
 */
export async function logResourceAccess(
  userId: string | undefined,
  resource: string,
  resourceId: string,
  action: AuditLogEntry['action'],
  status: 'success' | 'failure',
  ipAddress: string,
  userAgent: string
): Promise<void> {
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
  offset: number = 0
): Promise<AuditLogEntry[]> {
  if (!redisClient) return [];

  try {
    // Get audit log IDs from sorted set
    const logIds = await redisClient.zRange(
      `audit:user:${userId}`,
      offset,
      offset + limit - 1,
      { REV: true } // Most recent first
    );

    // Fetch full log entries
    const logs: AuditLogEntry[] = [];
    for (const logId of logIds) {
      const data = await redisClient.get(`audit:${logId}`);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }

    return logs;
  } catch (error) {
    console.error('Failed to retrieve user audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for operation type
 */
export async function getOperationAuditLogs(
  operation: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  if (!redisClient) return [];

  try {
    const logIds = await redisClient.zRange(
      `audit:operation:${operation}`,
      0,
      limit - 1,
      { REV: true }
    );

    const logs: AuditLogEntry[] = [];
    for (const logId of logIds) {
      const data = await redisClient.get(`audit:${logId}`);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }

    return logs;
  } catch (error) {
    console.error('Failed to retrieve operation audit logs:', error);
    return [];
  }
}

/**
 * Detect suspicious patterns in audit logs
 */
export async function detectSuspiciousPatterns(
  userId: string,
  windowMinutes: number = 60
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
    log => log.operation === 'user.login' && log.status === 'failure'
  );
  if (failedLogins.length >= securityConfig.suspiciousActivity.multipleFailedLogins) {
    patterns.push(`${failedLogins.length} failed login attempts`);
  }

  // Rapid account changes
  const accountChanges = recentLogs.filter(
    log => log.operation.includes('user.') && log.action === 'update'
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
  userId?: string
): Promise<AuditLogEntry[]> {
  // TODO: Implement database query for long-term storage
  // For now, return recent logs from Redis

  if (userId) {
    return getUserAuditLogs(userId, 10000);
  }

  return [];
}
