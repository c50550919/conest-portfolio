/**
 * Environment Variable Validation
 *
 * Purpose: Validate required environment variables at startup to prevent
 *          runtime failures due to missing or invalid configuration.
 *
 * Constitution Principles:
 * - Principle III: Security-First (validate secrets meet minimum standards)
 * - Principle V: Code Quality (fail fast with clear error messages)
 *
 * Security Requirements:
 * - JWT secrets: minimum 32 characters
 * - Stripe keys: valid format (sk_test_ or sk_live_ prefix)
 * - API keys: minimum 20 characters
 * - Database passwords: minimum 16 characters
 *
 * Created: 2025-11-10 (Security Hardening Initiative)
 */

import logger from './logger';

/**
 * Environment variable validation rule
 */
interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * Environment variable validation configuration
 */
const ENV_VALIDATION_RULES: Record<string, ValidationRule> = {
  // Server Configuration
  NODE_ENV: {
    required: true,
    pattern: /^(development|production|test)$/,
    errorMessage: 'NODE_ENV must be development, production, or test',
  },
  PORT: {
    required: false,
    validator: (value: string) => {
      const port = parseInt(value, 10);
      return !isNaN(port) && port > 0 && port <= 65535;
    },
    errorMessage: 'PORT must be a valid port number (1-65535)',
  },

  // Database Configuration
  DB_HOST: {
    required: true,
    minLength: 1,
    errorMessage: 'DB_HOST is required',
  },
  DB_PORT: {
    required: true,
    validator: (value: string) => {
      const port = parseInt(value, 10);
      return !isNaN(port) && port > 0 && port <= 65535;
    },
    errorMessage: 'DB_PORT must be a valid port number',
  },
  DB_NAME: {
    required: true,
    minLength: 1,
    errorMessage: 'DB_NAME is required',
  },
  DB_USER: {
    required: true,
    minLength: 1,
    errorMessage: 'DB_USER is required',
  },
  DB_PASSWORD: {
    required: true,
    minLength: 16,
    errorMessage: 'DB_PASSWORD must be at least 16 characters for security',
  },

  // Redis Configuration
  REDIS_HOST: {
    required: true,
    minLength: 1,
    errorMessage: 'REDIS_HOST is required',
  },
  REDIS_PORT: {
    required: true,
    validator: (value: string) => {
      const port = parseInt(value, 10);
      return !isNaN(port) && port > 0 && port <= 65535;
    },
    errorMessage: 'REDIS_PORT must be a valid port number',
  },

  // JWT Configuration (CRITICAL SECURITY)
  JWT_SECRET: {
    required: true,
    minLength: 32,
    errorMessage: 'JWT_SECRET must be at least 32 characters for security',
    validator: (value: string) => {
      // Reject common placeholder values
      const insecurePlaceholders = [
        'your_jwt_secret_here',
        'change_in_production',
        'secret',
        'jwt_secret',
      ];
      return !insecurePlaceholders.some(placeholder =>
        value.toLowerCase().includes(placeholder)
      );
    },
  },
  JWT_REFRESH_SECRET: {
    required: true,
    minLength: 32,
    errorMessage: 'JWT_REFRESH_SECRET must be at least 32 characters for security',
    validator: (value: string) => {
      // Reject common placeholder values
      const insecurePlaceholders = [
        'your_refresh_secret_here',
        'change_in_production',
        'secret',
        'refresh_secret',
      ];
      return !insecurePlaceholders.some(placeholder =>
        value.toLowerCase().includes(placeholder)
      );
    },
  },
  JWT_EXPIRES_IN: {
    required: false,
    pattern: /^\d+[smhd]$/,
    errorMessage: 'JWT_EXPIRES_IN must be in format: 15m, 1h, 7d, etc.',
  },
  JWT_REFRESH_EXPIRES_IN: {
    required: false,
    pattern: /^\d+[smhd]$/,
    errorMessage: 'JWT_REFRESH_EXPIRES_IN must be in format: 15m, 1h, 7d, etc.',
  },

  // Stripe Configuration (Payment-First Architecture)
  STRIPE_SECRET_KEY: {
    required: true,
    pattern: /^sk_(test|live)_[A-Za-z0-9]{24,}$/,
    errorMessage: 'STRIPE_SECRET_KEY must be a valid Stripe secret key (sk_test_* or sk_live_*)',
  },
  STRIPE_PUBLISHABLE_KEY: {
    required: true,
    pattern: /^pk_(test|live)_[A-Za-z0-9]{24,}$/,
    errorMessage: 'STRIPE_PUBLISHABLE_KEY must be a valid Stripe publishable key (pk_test_* or pk_live_*)',
  },
  STRIPE_WEBHOOK_SECRET: {
    required: true,
    pattern: /^whsec_[A-Za-z0-9]{24,}$/,
    errorMessage: 'STRIPE_WEBHOOK_SECRET must be a valid Stripe webhook secret (whsec_*)',
  },

  // Verification Providers (ID Verification)
  VERIFF_API_KEY: {
    required: true,
    minLength: 20,
    errorMessage: 'VERIFF_API_KEY must be at least 20 characters',
  },
  VERIFF_BASE_URL: {
    required: false,
    pattern: /^https:\/\/.+/,
    errorMessage: 'VERIFF_BASE_URL must be a valid HTTPS URL',
  },

  // Background Check Provider
  CERTN_API_KEY: {
    required: true,
    minLength: 20,
    errorMessage: 'CERTN_API_KEY must be at least 20 characters',
  },
  CERTN_BASE_URL: {
    required: false,
    pattern: /^https:\/\/.+/,
    errorMessage: 'CERTN_BASE_URL must be a valid HTTPS URL',
  },

  // SMS/Phone Verification (Twilio)
  TWILIO_ACCOUNT_SID: {
    required: true,
    pattern: /^AC[a-f0-9]{32}$/,
    errorMessage: 'TWILIO_ACCOUNT_SID must be a valid Twilio Account SID (AC followed by 32 hex chars)',
  },
  TWILIO_AUTH_TOKEN: {
    required: true,
    minLength: 32,
    errorMessage: 'TWILIO_AUTH_TOKEN must be at least 32 characters',
  },
  TWILIO_PHONE_NUMBER: {
    required: true,
    pattern: /^\+\d{10,15}$/,
    errorMessage: 'TWILIO_PHONE_NUMBER must be in E.164 format (+15555555555)',
  },

  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: {
    required: true,
    minLength: 16,
    maxLength: 128,
    errorMessage: 'AWS_ACCESS_KEY_ID must be 16-128 characters',
  },
  AWS_SECRET_ACCESS_KEY: {
    required: true,
    minLength: 40,
    errorMessage: 'AWS_SECRET_ACCESS_KEY must be at least 40 characters',
  },
  AWS_REGION: {
    required: true,
    pattern: /^[a-z]{2}-[a-z]+-\d$/,
    errorMessage: 'AWS_REGION must be a valid AWS region (e.g., us-east-1)',
  },
  AWS_S3_BUCKET: {
    required: true,
    minLength: 3,
    maxLength: 63,
    pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    errorMessage: 'AWS_S3_BUCKET must be a valid S3 bucket name (lowercase, 3-63 chars)',
  },

  // Security Configuration
  BCRYPT_ROUNDS: {
    required: false,
    validator: (value: string) => {
      const rounds = parseInt(value, 10);
      return !isNaN(rounds) && rounds >= 10 && rounds <= 15;
    },
    errorMessage: 'BCRYPT_ROUNDS must be between 10 and 15 for optimal security/performance',
  },

  // CORS Configuration
  CORS_ORIGIN: {
    required: false,
    pattern: /^https?:\/\/.+/,
    errorMessage: 'CORS_ORIGIN must be a valid HTTP/HTTPS URL',
  },
};

/**
 * Validation error details
 */
interface ValidationError {
  variable: string;
  error: string;
  currentValue?: string;
}

/**
 * Validate a single environment variable
 */
function validateVariable(
  varName: string,
  rule: ValidationRule
): ValidationError | null {
  const value = process.env[varName];

  // Check if required
  if (rule.required && !value) {
    return {
      variable: varName,
      error: rule.errorMessage || `${varName} is required but not set`,
    };
  }

  // If not required and not set, skip validation
  if (!value) {
    return null;
  }

  // Check minimum length
  if (rule.minLength && value.length < rule.minLength) {
    return {
      variable: varName,
      error: rule.errorMessage || `${varName} must be at least ${rule.minLength} characters`,
      currentValue: `${value.substring(0, 10)}... (length: ${value.length})`,
    };
  }

  // Check maximum length
  if (rule.maxLength && value.length > rule.maxLength) {
    return {
      variable: varName,
      error: rule.errorMessage || `${varName} must be at most ${rule.maxLength} characters`,
      currentValue: `${value.substring(0, 10)}... (length: ${value.length})`,
    };
  }

  // Check pattern
  if (rule.pattern && !rule.pattern.test(value)) {
    return {
      variable: varName,
      error: rule.errorMessage || `${varName} does not match required format`,
      currentValue: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
    };
  }

  // Check custom validator
  if (rule.validator && !rule.validator(value)) {
    return {
      variable: varName,
      error: rule.errorMessage || `${varName} failed custom validation`,
      currentValue: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
    };
  }

  return null;
}

/**
 * Validate all environment variables
 * @throws Error if validation fails
 */
export function validateEnvironment(): void {
  const errors: ValidationError[] = [];

  // Validate all configured variables
  for (const [varName, rule] of Object.entries(ENV_VALIDATION_RULES)) {
    const error = validateVariable(varName, rule);
    if (error) {
      errors.push(error);
    }
  }

  // If there are errors, log them and throw
  if (errors.length > 0) {
    logger.error('❌ Environment variable validation failed:');
    logger.error('');

    errors.forEach((error, index) => {
      logger.error(`${index + 1}. ${error.variable}:`);
      logger.error(`   Error: ${error.error}`);
      if (error.currentValue) {
        logger.error(`   Current: ${error.currentValue}`);
      }
      logger.error('');
    });

    logger.error(`Total errors: ${errors.length}`);
    logger.error('');
    logger.error('Please check your .env file and fix the above errors.');
    logger.error('See .env.example for correct format and required values.');

    throw new Error(
      `Environment validation failed with ${errors.length} error(s). Check logs for details.`
    );
  }

  // Success
  logger.info('✅ Environment variable validation passed');
  logger.info(`   Validated ${Object.keys(ENV_VALIDATION_RULES).length} environment variables`);
}

/**
 * Get validation summary (for health checks)
 */
export function getValidationSummary(): {
  totalRules: number;
  requiredVariables: string[];
  optionalVariables: string[];
  missingRequired: string[];
} {
  const requiredVariables: string[] = [];
  const optionalVariables: string[] = [];
  const missingRequired: string[] = [];

  for (const [varName, rule] of Object.entries(ENV_VALIDATION_RULES)) {
    if (rule.required) {
      requiredVariables.push(varName);
      if (!process.env[varName]) {
        missingRequired.push(varName);
      }
    } else {
      optionalVariables.push(varName);
    }
  }

  return {
    totalRules: Object.keys(ENV_VALIDATION_RULES).length,
    requiredVariables,
    optionalVariables,
    missingRequired,
  };
}

/**
 * Check if running in production with secure configuration
 */
export function validateProductionSecurity(): void {
  if (process.env.NODE_ENV !== 'production') {
    return; // Skip for development/test
  }

  const productionChecks: ValidationError[] = [];

  // Ensure Stripe is in live mode
  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    productionChecks.push({
      variable: 'STRIPE_SECRET_KEY',
      error: 'Production environment must use live Stripe keys (sk_live_*), not test keys',
      currentValue: 'sk_test_***',
    });
  }

  // Ensure CORS is properly configured
  if (
    process.env.CORS_ORIGIN === 'http://localhost:19006' ||
    process.env.CORS_ORIGIN?.includes('localhost')
  ) {
    productionChecks.push({
      variable: 'CORS_ORIGIN',
      error: 'Production environment should not allow localhost CORS origins',
      currentValue: process.env.CORS_ORIGIN,
    });
  }

  // Ensure TLS/HTTPS for external URLs
  const httpsRequiredVars = ['VERIFF_BASE_URL', 'CERTN_BASE_URL'];
  httpsRequiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && !value.startsWith('https://')) {
      productionChecks.push({
        variable: varName,
        error: 'Production environment must use HTTPS URLs',
        currentValue: value.substring(0, 20),
      });
    }
  });

  if (productionChecks.length > 0) {
    logger.warn('⚠️  Production security warnings:');
    productionChecks.forEach((check, index) => {
      logger.warn(`${index + 1}. ${check.variable}: ${check.error}`);
    });
    logger.warn('');
    logger.warn('These are not fatal errors but should be addressed before production deployment.');
  }
}

export default {
  validateEnvironment,
  getValidationSummary,
  validateProductionSecurity,
};
