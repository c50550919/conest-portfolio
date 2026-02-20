/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Centralized Security Configuration
 * Defines all security-related settings and constants
 */

export const securityConfig = {
  // Password Requirements
  password: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: 12,
    commonPasswordsFile: 'common-passwords.txt',
  },

  // JWT Configuration
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256' as const,
    issuer: 'safenest-api',
    audience: 'safenest-app',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,

    // IP-based rate limiting
    ipWindowMs: 15 * 60 * 1000,
    maxRequestsPerIP: 100,

    // Endpoint-specific limits
    auth: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5, // 5 attempts per 15 min
    },
    api: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 60, // 60 requests per minute
    },
  },

  // Account Lockout
  accountLockout: {
    maxFailedAttempts: 5,
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
    resetAfterSuccessfulLogin: true,
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm' as const,
    keyLength: 32,
    ivLength: 16,
    authTagLength: 16,
    saltLength: 16,
    iterations: 100000, // PBKDF2 iterations
    digest: 'sha256' as const,
  },

  // Session Management
  session: {
    ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    extendOnActivity: true,
    maxConcurrentSessions: 5,
    deviceFingerprintEnabled: true,
  },

  // Request Security
  request: {
    maxBodySize: '10mb',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    timeout: 30000, // 30 seconds
  },

  // CSRF Protection
  csrf: {
    tokenLength: 32,
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },

  // Security Headers
  headers: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      xssFilter: true,
    },
  },

  // Audit Logging
  audit: {
    sensitiveOperations: [
      'user.login',
      'user.logout',
      'user.passwordChange',
      'user.delete',
      'verification.complete',
      'payment.processed',
      'match.created',
      'household.joined',
    ],
    retentionDays: 365,
    logPII: false, // Use tokenization instead
  },

  // Suspicious Activity Detection
  suspiciousActivity: {
    multipleFailedLogins: 3,
    unusualLocationThreshold: 500, // km from last login
    unusualTimeThreshold: 3, // hours from usual login time
    rapidAccountChanges: 5, // changes within 1 hour
  },

  // Data Sensitivity Levels
  dataSensitivity: {
    public: ['username', 'joinedDate'],
    internal: ['email', 'phoneNumber'],
    confidential: ['address', 'income', 'backgroundCheckResult'],
    restricted: ['governmentId', 'ssn', 'paymentDetails'],
  },
} as const;

// Export type for TypeScript
export type SecurityConfig = typeof securityConfig;

// Common passwords list (top 100 most common passwords)
export const commonPasswords = [
  'password', '123456', '123456789', 'qwerty', 'abc123',
  'password1', '12345678', '111111', '1234567', 'sunshine',
  'password123', 'letmein', 'welcome', 'monkey', 'admin',
  'iloveyou', 'master', 'princess', 'dragon', 'shadow',
  // Add more common passwords as needed
];

// Sensitive field patterns for sanitization
export const sensitiveFieldPatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /ssn/i,
  /credit.*card/i,
  /cvv/i,
  /pin/i,
];
