/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { z } from 'zod';
import dotenv from 'dotenv';
import logger from './logger';

// Load environment variables
dotenv.config();

/**
 * Environment Variable Validation Schema
 *
 * Flexible validation that supports development, testing, and production modes
 * Use SECURITY_MODE to control security enforcement levels
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),

  // Security Mode: Controls security enforcement level
  // - development: Minimal security, allows mocks, loose validation
  // - testing: Selective security, can toggle features for testing
  // - staging: Production-like security with some flexibility
  // - production: Full security enforcement, no mocks allowed
  SECURITY_MODE: z.enum(['development', 'testing', 'staging', 'production']).default('development'),

  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  API_URL: z.string().url().optional(),

  // Database Configuration
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().regex(/^\d+$/).transform(Number),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1), // Relaxed for development, enforced in production

  // Redis Configuration
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // JWT Configuration (validation relaxed for development/testing)
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Stripe Configuration
  // In development: defaults to placeholder (payments will fail but app runs)
  // In production: must provide real keys (enforced in enforceProductionSecurity)
  STRIPE_SECRET_KEY: z.string().min(1).default('sk_test_not_configured'),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).default('pk_test_not_configured'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).default('whsec_not_configured'),

  // Verification Providers
  VERIFF_API_KEY: z.string().optional(),
  VERIFF_API_SECRET: z.string().optional(),
  VERIFF_BASE_URL: z.string().url().default('https://stationapi.veriff.com'),
  ID_PROVIDER: z.enum(['veriff', 'mock']).default('mock'),

  CERTN_API_KEY: z.string().optional(),
  CERTN_BASE_URL: z.string().url().default('https://api.certn.co/v1'),
  // Webhook secret for verifying Certn webhook signatures (HMAC-SHA256)
  // Generate from: https://app.certn.co/ → Team Settings → Webhooks
  CERTN_WEBHOOK_SECRET: z.string().optional(),
  // Max age for webhook timestamp validation (default: 5 minutes)
  CERTN_WEBHOOK_TOLERANCE_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('300'),
  BG_CHECK_PROVIDER: z.enum(['certn', 'mock']).default('mock'),

  // Verification Settings
  VERIFICATION_GRACE_PERIOD_DAYS: z.string().regex(/^\d+$/).transform(Number).default('7'),
  ADMIN_REVIEW_SLA_HOURS: z.string().regex(/^\d+$/).transform(Number).default('48'),

  // Telnyx Phone Verification
  // Required in production for phone verification, optional in development (falls back to mock)
  TELNYX_API_KEY: z.string().optional(),
  TELNYX_VERIFY_PROFILE_ID: z.string().optional(),
  TELNYX_BASE_URL: z.string().url().default('https://api.telnyx.com/v2'),

  // Twilio Configuration (legacy - replaced by Telnyx for phone verification)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().min(1),

  // Security
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).default('12'),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),

  // Message Encryption (AES-256-GCM)
  // Auto-generated in development if not provided
  ENCRYPTION_MASTER_KEY: z.string().optional(),

  // Admin Configuration
  ADMIN_EMAILS: z.string().default(''),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:19006'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Cron Jobs
  ENABLE_CRON_JOBS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Security Feature Flags (can be toggled for testing)
  ENABLE_RATE_LIMITING: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_JWT_VALIDATION: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_ENCRYPTION: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_CSRF_PROTECTION: z
    .string()
    .transform((val) => val === 'true')
    .default('false'), // Disabled by default for API-only backend
  ENABLE_ACCOUNT_LOCKOUT: z
    .string()
    .transform((val) => val === 'true')
    .default('false'), // Can enable when ready
  ENABLE_VERIFICATION_CHECKS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_PAYMENT_VALIDATION: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  // Security Event Logging
  SECURITY_LOG_WEBHOOK_URL: z.string().url().optional(),
  ENABLE_SECURITY_ALERTS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Account Security Settings
  MAX_LOGIN_ATTEMPTS: z.string().regex(/^\d+$/).transform(Number).default('5'),
  LOGIN_LOCKOUT_DURATION_MINUTES: z.string().regex(/^\d+$/).transform(Number).default('15'),

  // Token Rotation Settings
  ENABLE_TOKEN_ROTATION: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  TOKEN_ROTATION_THRESHOLD_DAYS: z.string().regex(/^\d+$/).transform(Number).default('3'),

  // Email Service (SendGrid)
  SENDGRID_API_KEY: z.string().default('SG.not_configured'),
  SENDGRID_FROM_EMAIL: z.string().email().default('noreply@conest.app'),
  SENDGRID_FROM_NAME: z.string().default('CoNest'),

  // Push Notifications (Firebase Cloud Messaging)
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default(''),
});

/**
 * Validated environment variables
 * Type-safe access to all configuration
 */
export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

/**
 * Validate environment variables on startup
 * Enforces strict validation in production, lenient in development
 */
export function validateEnv(): Env {
  try {
    validatedEnv = envSchema.parse(process.env);

    // Auto-generate encryption key if not provided in development
    if (!validatedEnv.ENCRYPTION_MASTER_KEY) {
      if (validatedEnv.SECURITY_MODE === 'development' || validatedEnv.SECURITY_MODE === 'testing') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cryptoModule = require('crypto');
        const key = cryptoModule.randomBytes(32).toString('base64');
        validatedEnv.ENCRYPTION_MASTER_KEY = key;
        logger.warn('⚠️  Auto-generated ENCRYPTION_MASTER_KEY for development (DO NOT USE IN PRODUCTION)');
      } else {
        throw new Error('ENCRYPTION_MASTER_KEY is required in staging/production modes');
      }
    }

    // Validate encryption key format
    if (validatedEnv.ENCRYPTION_MASTER_KEY) {
      try {
        const decoded = Buffer.from(validatedEnv.ENCRYPTION_MASTER_KEY, 'base64');
        if (decoded.length !== 32) {
          throw new Error('ENCRYPTION_MASTER_KEY must be 32 bytes (256 bits)');
        }
      } catch (error) {
        throw new Error('ENCRYPTION_MASTER_KEY must be a valid base64-encoded 32-byte key');
      }
    }

    // Security mode-specific validations
    const securityMode = validatedEnv.SECURITY_MODE;

    if (securityMode === 'production') {
      // PRODUCTION: Strict validation
      enforceProductionSecurity(validatedEnv);
    } else if (securityMode === 'staging') {
      // STAGING: Production-like with warnings
      enforceStagingSecurity(validatedEnv);
    } else if (securityMode === 'testing') {
      // TESTING: Warn about disabled security features
      logTestingSecurityStatus(validatedEnv);
    } else {
      // DEVELOPMENT: Permissive with warnings
      logDevelopmentSecurityStatus(validatedEnv);
    }

    logger.info('✅ Environment variables validated successfully', {
      nodeEnv: validatedEnv.NODE_ENV,
      securityMode: validatedEnv.SECURITY_MODE,
      port: validatedEnv.PORT,
      idProvider: validatedEnv.ID_PROVIDER,
      bgCheckProvider: validatedEnv.BG_CHECK_PROVIDER,
      telnyxConfigured: !!(validatedEnv.TELNYX_API_KEY && validatedEnv.TELNYX_VERIFY_PROFILE_ID),
      certnConfigured: !!(validatedEnv.CERTN_API_KEY && validatedEnv.CERTN_WEBHOOK_SECRET),
      stripeConfigured: {
        liveMode: validatedEnv.STRIPE_SECRET_KEY.startsWith('sk_live_'),
        webhookConfigured: validatedEnv.STRIPE_WEBHOOK_SECRET !== 'whsec_not_configured' && validatedEnv.STRIPE_WEBHOOK_SECRET !== 'whsec_placeholder',
      },
      securityFeatures: {
        rateLimiting: validatedEnv.ENABLE_RATE_LIMITING,
        jwtValidation: validatedEnv.ENABLE_JWT_VALIDATION,
        encryption: validatedEnv.ENABLE_ENCRYPTION,
        accountLockout: validatedEnv.ENABLE_ACCOUNT_LOCKOUT,
        verificationChecks: validatedEnv.ENABLE_VERIFICATION_CHECKS,
      },
    });

    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Environment variable validation failed:', {
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });

      const errorMessages = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Production security rule definition
 */
interface ProductionSecurityRule {
  check: (env: Env) => boolean;
  error: string;
}

/**
 * Development default values that are forbidden in production
 */
const FORBIDDEN_DEV_DEFAULTS: Array<{ key: keyof Env; values: string[] }> = [
  { key: 'DB_PASSWORD', values: ['', 'your_secure_password_here'] },
  { key: 'JWT_SECRET', values: ['dev-secret-change-in-production-2024', 'your_jwt_secret_here_change_in_production'] },
  { key: 'JWT_REFRESH_SECRET', values: ['dev-refresh-secret-change-in-production-2024'] },
];

/**
 * Data-driven production security rules
 * Reduces cyclomatic complexity by using configuration over conditionals
 */
const PRODUCTION_SECURITY_RULES: ProductionSecurityRule[] = [
  // JWT strength requirements
  { check: (env) => env.JWT_SECRET.length >= 32, error: 'JWT_SECRET must be at least 32 characters in production' },
  { check: (env) => env.JWT_REFRESH_SECRET.length >= 32, error: 'JWT_REFRESH_SECRET must be at least 32 characters in production' },

  // Stripe live mode requirements
  { check: (env) => env.STRIPE_SECRET_KEY.startsWith('sk_live_'), error: 'STRIPE_SECRET_KEY must use live key (sk_live_) in production' },
  { check: (env) => env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_'), error: 'STRIPE_PUBLISHABLE_KEY must use live key (pk_live_) in production' },
  { check: (env) => env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_') && env.STRIPE_WEBHOOK_SECRET !== 'whsec_not_configured' && env.STRIPE_WEBHOOK_SECRET !== 'whsec_placeholder', error: 'STRIPE_WEBHOOK_SECRET must be configured with real webhook secret in production (get from Stripe dashboard)' },

  // No mock providers in production
  { check: (env) => env.ID_PROVIDER !== 'mock', error: 'ID_PROVIDER cannot be "mock" in production' },
  { check: (env) => env.BG_CHECK_PROVIDER !== 'mock', error: 'BG_CHECK_PROVIDER cannot be "mock" in production' },

  // API keys required for real providers
  { check: (env) => env.ID_PROVIDER !== 'veriff' || !!env.VERIFF_API_KEY, error: 'VERIFF_API_KEY is required when using Veriff in production' },
  { check: (env) => env.BG_CHECK_PROVIDER !== 'certn' || !!env.CERTN_API_KEY, error: 'CERTN_API_KEY is required when using Certn in production' },
  // Certn webhook secret required for secure webhook processing (prevents spoofing attacks)
  { check: (env) => env.BG_CHECK_PROVIDER !== 'certn' || !!env.CERTN_WEBHOOK_SECRET, error: 'CERTN_WEBHOOK_SECRET is required when using Certn in production (generate from Certn dashboard)' },

  // Telnyx required in production for phone verification (no mock fallback allowed)
  { check: (env) => !!env.TELNYX_API_KEY, error: 'TELNYX_API_KEY is required in production for phone verification' },
  { check: (env) => !!env.TELNYX_VERIFY_PROFILE_ID, error: 'TELNYX_VERIFY_PROFILE_ID is required in production for phone verification' },

  // Required security features
  { check: (env) => env.ENABLE_RATE_LIMITING, error: 'ENABLE_RATE_LIMITING must be true in production' },
  { check: (env) => env.ENABLE_JWT_VALIDATION, error: 'ENABLE_JWT_VALIDATION must be true in production' },
  { check: (env) => env.ENABLE_ENCRYPTION, error: 'ENABLE_ENCRYPTION must be true in production' },
  { check: (env) => env.ENABLE_VERIFICATION_CHECKS, error: 'ENABLE_VERIFICATION_CHECKS must be true in production' },
];

/**
 * Check for forbidden development default values
 */
function checkDevDefaults(env: Env): string[] {
  return FORBIDDEN_DEV_DEFAULTS
    .filter(({ key, values }) => values.includes(String(env[key])))
    .map(({ key }) => `${key} cannot use development default in production`);
}

/**
 * Enforce production security requirements
 * All security features must be enabled, no mocks allowed
 * Refactored to use data-driven rules (reduced cyclomatic complexity)
 */
function enforceProductionSecurity(env: Env): void {
  const errors: string[] = [
    ...checkDevDefaults(env),
    ...PRODUCTION_SECURITY_RULES.filter((rule) => !rule.check(env)).map((rule) => rule.error),
  ];

  if (errors.length > 0) {
    throw new Error(
      `Production security validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }

  logger.info('✅ Production security requirements met');
}

/**
 * Enforce staging security with warnings
 * Production-like but allows some flexibility
 */
function enforceStagingSecurity(env: Env): void {
  const warnings: string[] = [];

  // Check for weak secrets
  if (env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters');
  }

  // Warn about mock providers
  if (env.ID_PROVIDER === 'mock') {
    warnings.push('Using mock ID verification provider (not recommended for staging)');
  }
  if (env.BG_CHECK_PROVIDER === 'mock') {
    warnings.push('Using mock background check provider (not recommended for staging)');
  }

  // Warn about missing Telnyx configuration (phone verification will use mock)
  if (!env.TELNYX_API_KEY || !env.TELNYX_VERIFY_PROFILE_ID) {
    warnings.push('Telnyx not configured - phone verification will use mock mode (not recommended for staging)');
  }

  // Warn about missing Certn webhook secret (webhooks will be insecure)
  if (env.BG_CHECK_PROVIDER === 'certn' && !env.CERTN_WEBHOOK_SECRET) {
    warnings.push('CERTN_WEBHOOK_SECRET not configured - webhook signature verification disabled (security risk)');
  }

  // Warn about Stripe test keys in staging
  if (env.STRIPE_SECRET_KEY.startsWith('sk_test_') || env.STRIPE_SECRET_KEY === 'sk_test_not_configured') {
    warnings.push('STRIPE_SECRET_KEY is using test key (sk_test_) - payments will not process real charges');
  }
  if (env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') || env.STRIPE_PUBLISHABLE_KEY === 'pk_test_not_configured') {
    warnings.push('STRIPE_PUBLISHABLE_KEY is using test key (pk_test_) - payments will not process real charges');
  }
  if (env.STRIPE_WEBHOOK_SECRET === 'whsec_not_configured' || env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder') {
    warnings.push('STRIPE_WEBHOOK_SECRET not configured - webhook signature verification will fail');
  }

  // Warn about disabled security features
  if (!env.ENABLE_ACCOUNT_LOCKOUT) {
    warnings.push('Account lockout is disabled (consider enabling for staging)');
  }
  if (!env.ENABLE_TOKEN_ROTATION) {
    warnings.push('Token rotation is disabled (consider enabling for staging)');
  }

  if (warnings.length > 0) {
    logger.warn('⚠️  Staging security warnings:', { warnings });
  }
}

/**
 * Log testing security status
 * Show which security features are disabled for testing
 */
function logTestingSecurityStatus(env: Env): void {
  const disabledFeatures: string[] = [];

  if (!env.ENABLE_RATE_LIMITING) disabledFeatures.push('Rate Limiting');
  if (!env.ENABLE_JWT_VALIDATION) disabledFeatures.push('JWT Validation');
  if (!env.ENABLE_ENCRYPTION) disabledFeatures.push('Message Encryption');
  if (!env.ENABLE_ACCOUNT_LOCKOUT) disabledFeatures.push('Account Lockout');
  if (!env.ENABLE_VERIFICATION_CHECKS) disabledFeatures.push('Verification Checks');
  if (!env.ENABLE_PAYMENT_VALIDATION) disabledFeatures.push('Payment Validation');

  if (disabledFeatures.length > 0) {
    logger.warn('⚠️  Testing mode - Some security features disabled:', { disabledFeatures });
  }
}

/**
 * Log development security status
 * Warn about relaxed security in development
 */
function logDevelopmentSecurityStatus(_env: Env): void {
  logger.warn('⚠️  Development mode - Security is relaxed for fast iteration');
  logger.warn('⚠️  DO NOT use this configuration in production!');
}

/**
 * Get validated environment variables
 * Must call validateEnv() first during application startup
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnv() first.');
  }
  return validatedEnv;
}

/**
 * Generate a new encryption master key
 * Use this to generate ENCRYPTION_MASTER_KEY for .env
 */
export function generateEncryptionKey(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cryptoModule = require('crypto');
  const key = cryptoModule.randomBytes(32); // 256 bits
  return key.toString('base64');
}

// Export for use in tests
export { envSchema };
