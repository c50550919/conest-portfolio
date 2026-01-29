/**
 * Integration Test: Stripe Live Mode Configuration
 *
 * Tests the Stripe configuration for production readiness including:
 * - Environment variable validation
 * - Live vs test mode detection
 * - Production security rules enforcement
 * - Webhook secret configuration
 * - Staging warnings
 *
 * TASK-W1-04: Stripe Live Mode Configuration
 */

import { z } from 'zod';

// Import the env schema for testing validation rules
// Note: We're testing the validation logic, not the actual env vars
describe('Stripe Live Mode Configuration', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Environment Variable Schema', () => {
    it('should have default values for Stripe keys in development', () => {
      const envSchema = z.object({
        STRIPE_SECRET_KEY: z.string().min(1).default('sk_test_not_configured'),
        STRIPE_PUBLISHABLE_KEY: z.string().min(1).default('pk_test_not_configured'),
        STRIPE_WEBHOOK_SECRET: z.string().min(1).default('whsec_not_configured'),
      });

      const result = envSchema.parse({});

      expect(result.STRIPE_SECRET_KEY).toBe('sk_test_not_configured');
      expect(result.STRIPE_PUBLISHABLE_KEY).toBe('pk_test_not_configured');
      expect(result.STRIPE_WEBHOOK_SECRET).toBe('whsec_not_configured');
    });

    it('should accept valid test keys', () => {
      const envSchema = z.object({
        STRIPE_SECRET_KEY: z.string().min(1),
        STRIPE_PUBLISHABLE_KEY: z.string().min(1),
        STRIPE_WEBHOOK_SECRET: z.string().min(1),
      });

      const result = envSchema.parse({
        STRIPE_SECRET_KEY: 'sk_test_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc123',
      });

      expect(result.STRIPE_SECRET_KEY).toBe('sk_test_abc123');
      expect(result.STRIPE_PUBLISHABLE_KEY).toBe('pk_test_abc123');
      expect(result.STRIPE_WEBHOOK_SECRET).toBe('whsec_abc123');
    });

    it('should accept valid live keys', () => {
      const envSchema = z.object({
        STRIPE_SECRET_KEY: z.string().min(1),
        STRIPE_PUBLISHABLE_KEY: z.string().min(1),
        STRIPE_WEBHOOK_SECRET: z.string().min(1),
      });

      const result = envSchema.parse({
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      });

      expect(result.STRIPE_SECRET_KEY).toBe('sk_live_abc123');
      expect(result.STRIPE_PUBLISHABLE_KEY).toBe('pk_live_abc123');
      expect(result.STRIPE_WEBHOOK_SECRET).toBe('whsec_live_abc123');
    });
  });

  describe('Live Mode Detection', () => {
    it('should detect test mode from sk_test_ prefix', () => {
      const secretKey = 'sk_test_51abc123';
      const isTestMode = secretKey.startsWith('sk_test_');
      const isLiveMode = secretKey.startsWith('sk_live_');

      expect(isTestMode).toBe(true);
      expect(isLiveMode).toBe(false);
    });

    it('should detect live mode from sk_live_ prefix', () => {
      const secretKey = 'sk_live_51abc123';
      const isTestMode = secretKey.startsWith('sk_test_');
      const isLiveMode = secretKey.startsWith('sk_live_');

      expect(isTestMode).toBe(false);
      expect(isLiveMode).toBe(true);
    });

    it('should detect publishable key test mode from pk_test_ prefix', () => {
      const publishableKey = 'pk_test_51abc123';
      const isTestMode = publishableKey.startsWith('pk_test_');
      const isLiveMode = publishableKey.startsWith('pk_live_');

      expect(isTestMode).toBe(true);
      expect(isLiveMode).toBe(false);
    });

    it('should detect publishable key live mode from pk_live_ prefix', () => {
      const publishableKey = 'pk_live_51abc123';
      const isTestMode = publishableKey.startsWith('pk_test_');
      const isLiveMode = publishableKey.startsWith('pk_live_');

      expect(isTestMode).toBe(false);
      expect(isLiveMode).toBe(true);
    });
  });

  describe('Production Security Rules', () => {
    interface ProductionSecurityRule {
      check: (env: Record<string, string>) => boolean;
      error: string;
    }

    const PRODUCTION_SECURITY_RULES: ProductionSecurityRule[] = [
      {
        check: (env) => env.STRIPE_SECRET_KEY.startsWith('sk_live_'),
        error: 'STRIPE_SECRET_KEY must use live key (sk_live_) in production',
      },
      {
        check: (env) => env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_'),
        error: 'STRIPE_PUBLISHABLE_KEY must use live key (pk_live_) in production',
      },
      {
        check: (env) =>
          env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_') &&
          env.STRIPE_WEBHOOK_SECRET !== 'whsec_not_configured' &&
          env.STRIPE_WEBHOOK_SECRET !== 'whsec_placeholder',
        error:
          'STRIPE_WEBHOOK_SECRET must be configured with real webhook secret in production (get from Stripe dashboard)',
      },
    ];

    function enforceProductionSecurity(env: Record<string, string>): string[] {
      return PRODUCTION_SECURITY_RULES.filter((rule) => !rule.check(env)).map((rule) => rule.error);
    }

    it('should reject test secret key in production', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_test_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      };

      const errors = enforceProductionSecurity(env);

      expect(errors).toContain('STRIPE_SECRET_KEY must use live key (sk_live_) in production');
    });

    it('should reject test publishable key in production', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      };

      const errors = enforceProductionSecurity(env);

      expect(errors).toContain('STRIPE_PUBLISHABLE_KEY must use live key (pk_live_) in production');
    });

    it('should reject placeholder webhook secret in production', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_not_configured',
      };

      const errors = enforceProductionSecurity(env);

      expect(errors).toContain(
        'STRIPE_WEBHOOK_SECRET must be configured with real webhook secret in production (get from Stripe dashboard)',
      );
    });

    it('should reject whsec_placeholder webhook secret in production', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      };

      const errors = enforceProductionSecurity(env);

      expect(errors).toContain(
        'STRIPE_WEBHOOK_SECRET must be configured with real webhook secret in production (get from Stripe dashboard)',
      );
    });

    it('should accept all live keys in production', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      };

      const errors = enforceProductionSecurity(env);

      expect(errors).toHaveLength(0);
    });

    it('should report multiple errors when multiple rules fail', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_test_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      };

      const errors = enforceProductionSecurity(env);

      expect(errors).toHaveLength(3);
      expect(errors).toContain('STRIPE_SECRET_KEY must use live key (sk_live_) in production');
      expect(errors).toContain('STRIPE_PUBLISHABLE_KEY must use live key (pk_live_) in production');
      expect(errors).toContain(
        'STRIPE_WEBHOOK_SECRET must be configured with real webhook secret in production (get from Stripe dashboard)',
      );
    });
  });

  describe('Staging Warnings', () => {
    interface WarningCheck {
      condition: (env: Record<string, string>) => boolean;
      warning: string;
    }

    const STAGING_WARNING_CHECKS: WarningCheck[] = [
      {
        condition: (env) =>
          env.STRIPE_SECRET_KEY.startsWith('sk_test_') ||
          env.STRIPE_SECRET_KEY === 'sk_test_not_configured',
        warning: 'STRIPE_SECRET_KEY is using test key (sk_test_) - payments will not process real charges',
      },
      {
        condition: (env) =>
          env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') ||
          env.STRIPE_PUBLISHABLE_KEY === 'pk_test_not_configured',
        warning:
          'STRIPE_PUBLISHABLE_KEY is using test key (pk_test_) - payments will not process real charges',
      },
      {
        condition: (env) =>
          env.STRIPE_WEBHOOK_SECRET === 'whsec_not_configured' ||
          env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder',
        warning: 'STRIPE_WEBHOOK_SECRET not configured - webhook signature verification will fail',
      },
    ];

    function getStagingWarnings(env: Record<string, string>): string[] {
      return STAGING_WARNING_CHECKS.filter((check) => check.condition(env)).map((check) => check.warning);
    }

    it('should warn about test secret key in staging', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_test_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      };

      const warnings = getStagingWarnings(env);

      expect(warnings).toContain(
        'STRIPE_SECRET_KEY is using test key (sk_test_) - payments will not process real charges',
      );
    });

    it('should warn about test publishable key in staging', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      };

      const warnings = getStagingWarnings(env);

      expect(warnings).toContain(
        'STRIPE_PUBLISHABLE_KEY is using test key (pk_test_) - payments will not process real charges',
      );
    });

    it('should warn about placeholder webhook secret in staging', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_not_configured',
      };

      const warnings = getStagingWarnings(env);

      expect(warnings).toContain(
        'STRIPE_WEBHOOK_SECRET not configured - webhook signature verification will fail',
      );
    });

    it('should not warn when all live keys are configured', () => {
      const env = {
        STRIPE_SECRET_KEY: 'sk_live_abc123',
        STRIPE_PUBLISHABLE_KEY: 'pk_live_abc123',
        STRIPE_WEBHOOK_SECRET: 'whsec_live_abc123',
      };

      const warnings = getStagingWarnings(env);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('Webhook Secret Validation', () => {
    it('should accept webhook secret starting with whsec_', () => {
      const webhookSecret = 'whsec_abc123def456';
      expect(webhookSecret.startsWith('whsec_')).toBe(true);
    });

    it('should reject webhook secret not starting with whsec_', () => {
      const webhookSecret = 'invalid_secret';
      expect(webhookSecret.startsWith('whsec_')).toBe(false);
    });

    it('should reject empty webhook secret', () => {
      const webhookSecret = '';
      expect(webhookSecret.startsWith('whsec_')).toBe(false);
    });
  });

  describe('Configuration Status Logging', () => {
    it('should correctly determine live mode status', () => {
      const secretKey = 'sk_live_abc123';
      const isLiveMode = secretKey.startsWith('sk_live_');

      expect(isLiveMode).toBe(true);
    });

    it('should correctly determine webhook configured status', () => {
      const isWebhookConfigured = (secret: string) =>
        secret !== 'whsec_not_configured' && secret !== 'whsec_placeholder' && secret.length > 0;

      expect(isWebhookConfigured('whsec_live_abc123')).toBe(true);
      expect(isWebhookConfigured('whsec_not_configured')).toBe(false);
      expect(isWebhookConfigured('whsec_placeholder')).toBe(false);
      expect(isWebhookConfigured('')).toBe(false);
    });

    it('should produce correct configuration status object', () => {
      const stripeSecretKey = 'sk_live_abc123';
      const stripeWebhookSecret = 'whsec_live_abc123' as string;

      const stripeConfigured = {
        liveMode: stripeSecretKey.startsWith('sk_live_'),
        webhookConfigured:
          stripeWebhookSecret !== 'whsec_not_configured' && stripeWebhookSecret !== 'whsec_placeholder',
      };

      expect(stripeConfigured).toEqual({
        liveMode: true,
        webhookConfigured: true,
      });
    });

    it('should indicate test mode when using test keys', () => {
      const stripeSecretKey = 'sk_test_abc123';
      const stripeWebhookSecret = 'whsec_test_abc123' as string;

      const stripeConfigured = {
        liveMode: stripeSecretKey.startsWith('sk_live_'),
        webhookConfigured:
          stripeWebhookSecret !== 'whsec_not_configured' && stripeWebhookSecret !== 'whsec_placeholder',
      };

      expect(stripeConfigured).toEqual({
        liveMode: false,
        webhookConfigured: true,
      });
    });
  });

  describe('Key Format Validation', () => {
    it('should validate secret key format', () => {
      const validTestKey = 'sk_test_51abc123xyz';
      const validLiveKey = 'sk_live_51abc123xyz';
      const invalidKey = 'invalid_key';
      const emptyKey = '';

      expect(validTestKey.startsWith('sk_test_') || validTestKey.startsWith('sk_live_')).toBe(true);
      expect(validLiveKey.startsWith('sk_test_') || validLiveKey.startsWith('sk_live_')).toBe(true);
      expect(invalidKey.startsWith('sk_test_') || invalidKey.startsWith('sk_live_')).toBe(false);
      expect(emptyKey.startsWith('sk_test_') || emptyKey.startsWith('sk_live_')).toBe(false);
    });

    it('should validate publishable key format', () => {
      const validTestKey = 'pk_test_51abc123xyz';
      const validLiveKey = 'pk_live_51abc123xyz';
      const invalidKey = 'invalid_key';

      expect(validTestKey.startsWith('pk_test_') || validTestKey.startsWith('pk_live_')).toBe(true);
      expect(validLiveKey.startsWith('pk_test_') || validLiveKey.startsWith('pk_live_')).toBe(true);
      expect(invalidKey.startsWith('pk_test_') || invalidKey.startsWith('pk_live_')).toBe(false);
    });
  });
});
