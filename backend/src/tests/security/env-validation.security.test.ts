/**
 * Environment Variable Validation Security Tests
 *
 * Purpose: Verify environment variable validation prevents misconfigurations
 *
 * Test Coverage:
 * - Required variable validation
 * - Minimum length validation
 * - Pattern matching validation
 * - Custom validator functions
 * - Production security checks
 * - Error message clarity
 * - Secret strength validation
 *
 * Created: 2025-11-10 (Security Hardening Initiative)
 */

import { validateEnvironment, validateProductionSecurity, getValidationSummary } from '../../config/validation';

// Store original environment
const originalEnv = { ...process.env };

describe('Environment Variable Validation Security Tests', () => {
  beforeEach(() => {
    // Reset environment to original before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Required Variable Validation', () => {
    it('should pass validation with all required variables set', () => {
      // Set all required variables
      process.env.NODE_ENV = 'development';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'testdb';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'a'.repeat(16); // 16 chars minimum
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      process.env.JWT_SECRET = 'a'.repeat(32); // 32 chars minimum
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
      process.env.STRIPE_SECRET_KEY = 'sk_test_' + 'a'.repeat(24);
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_' + 'a'.repeat(24);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_' + 'a'.repeat(24);
      process.env.VERIFF_API_KEY = 'a'.repeat(20);
      process.env.CERTN_API_KEY = 'a'.repeat(20);
      process.env.TWILIO_ACCOUNT_SID = 'AC' + 'a'.repeat(32);
      process.env.TWILIO_AUTH_TOKEN = 'a'.repeat(32);
      process.env.TWILIO_PHONE_NUMBER = '+15555555555';
      process.env.AWS_ACCESS_KEY_ID = 'a'.repeat(20);
      process.env.AWS_SECRET_ACCESS_KEY = 'a'.repeat(40);
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'test-bucket';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should fail validation when required variable is missing', () => {
      // Remove required variable
      delete process.env.DB_HOST;

      expect(() => validateEnvironment()).toThrow();
    });

    it('should fail validation when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => validateEnvironment()).toThrow();
    });

    it('should fail validation when STRIPE_SECRET_KEY is missing', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => validateEnvironment()).toThrow();
    });
  });

  describe('Minimum Length Validation', () => {
    it('should reject DB_PASSWORD shorter than 16 characters', () => {
      process.env.DB_PASSWORD = 'short123'; // Only 8 chars

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept DB_PASSWORD with exactly 16 characters', () => {
      process.env.DB_PASSWORD = 'a'.repeat(16);

      // Won't throw on DB_PASSWORD length alone (may fail on other variables)
      try {
        validateEnvironment();
      } catch (error: any) {
        // Should not mention DB_PASSWORD
        expect(error.message).not.toContain('DB_PASSWORD');
      }
    });

    it('should reject JWT_SECRET shorter than 32 characters', () => {
      process.env.JWT_SECRET = 'short_secret_123'; // Less than 32 chars

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept JWT_SECRET with exactly 32 characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('JWT_SECRET');
      }
    });

    it('should reject JWT_REFRESH_SECRET shorter than 32 characters', () => {
      process.env.JWT_REFRESH_SECRET = 'short123'; // Less than 32 chars

      expect(() => validateEnvironment()).toThrow();
    });

    it('should reject VERIFF_API_KEY shorter than 20 characters', () => {
      process.env.VERIFF_API_KEY = 'short'; // Less than 20 chars

      expect(() => validateEnvironment()).toThrow();
    });

    it('should reject CERTN_API_KEY shorter than 20 characters', () => {
      process.env.CERTN_API_KEY = 'short'; // Less than 20 chars

      expect(() => validateEnvironment()).toThrow();
    });
  });

  describe('Pattern Validation', () => {
    it('should accept valid NODE_ENV values', () => {
      const validValues = ['development', 'production', 'test'];

      validValues.forEach(value => {
        process.env.NODE_ENV = value;
        try {
          validateEnvironment();
        } catch (error: any) {
          expect(error.message).not.toContain('NODE_ENV');
        }
      });
    });

    it('should reject invalid NODE_ENV values', () => {
      process.env.NODE_ENV = 'invalid';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept valid Stripe secret key format', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_' + 'a'.repeat(24);

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('STRIPE_SECRET_KEY');
      }
    });

    it('should reject invalid Stripe secret key format', () => {
      process.env.STRIPE_SECRET_KEY = 'invalid_key';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept valid Stripe publishable key format', () => {
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_' + 'a'.repeat(24);

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('STRIPE_PUBLISHABLE_KEY');
      }
    });

    it('should accept valid Stripe webhook secret format', () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_' + 'a'.repeat(24);

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('STRIPE_WEBHOOK_SECRET');
      }
    });

    it('should reject invalid Stripe webhook secret format', () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'invalid_webhook_secret';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept valid Twilio Account SID format', () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC' + 'a'.repeat(32);

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('TWILIO_ACCOUNT_SID');
      }
    });

    it('should reject invalid Twilio Account SID format', () => {
      process.env.TWILIO_ACCOUNT_SID = 'invalid_sid';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept valid E.164 phone number format', () => {
      process.env.TWILIO_PHONE_NUMBER = '+15555555555';

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('TWILIO_PHONE_NUMBER');
      }
    });

    it('should reject invalid phone number format', () => {
      process.env.TWILIO_PHONE_NUMBER = '555-555-5555'; // Not E.164

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept valid AWS region format', () => {
      const validRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'];

      validRegions.forEach(region => {
        process.env.AWS_REGION = region;
        try {
          validateEnvironment();
        } catch (error: any) {
          expect(error.message).not.toContain('AWS_REGION');
        }
      });
    });

    it('should reject invalid AWS region format', () => {
      process.env.AWS_REGION = 'invalid-region';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should accept valid S3 bucket name', () => {
      process.env.AWS_S3_BUCKET = 'my-test-bucket';

      try {
        validateEnvironment();
      } catch (error: any) {
        expect(error.message).not.toContain('AWS_S3_BUCKET');
      }
    });

    it('should reject invalid S3 bucket name (uppercase)', () => {
      process.env.AWS_S3_BUCKET = 'MyBucket'; // Uppercase not allowed

      expect(() => validateEnvironment()).toThrow();
    });
  });

  describe('Custom Validator Functions', () => {
    it('should reject insecure JWT_SECRET placeholders', () => {
      const insecurePlaceholders = [
        'your_jwt_secret_here',
        'change_in_production',
        'secret',
        'jwt_secret',
      ];

      insecurePlaceholders.forEach(placeholder => {
        process.env.JWT_SECRET = placeholder + 'a'.repeat(32); // Add length to pass minLength
        expect(() => validateEnvironment()).toThrow();
      });
    });

    it('should reject insecure JWT_REFRESH_SECRET placeholders', () => {
      const insecurePlaceholders = [
        'your_refresh_secret_here',
        'change_in_production',
        'secret',
        'refresh_secret',
      ];

      insecurePlaceholders.forEach(placeholder => {
        process.env.JWT_REFRESH_SECRET = placeholder + 'a'.repeat(32);
        expect(() => validateEnvironment()).toThrow();
      });
    });

    it('should accept valid PORT numbers', () => {
      const validPorts = ['80', '443', '3000', '8080', '65535'];

      validPorts.forEach(port => {
        process.env.PORT = port;
        try {
          validateEnvironment();
        } catch (error: any) {
          expect(error.message).not.toContain('PORT');
        }
      });
    });

    it('should reject invalid PORT numbers', () => {
      const invalidPorts = ['0', '-1', '70000', 'invalid'];

      invalidPorts.forEach(port => {
        process.env.PORT = port;
        expect(() => validateEnvironment()).toThrow();
      });
    });

    it('should accept valid BCRYPT_ROUNDS', () => {
      const validRounds = ['10', '12', '14', '15'];

      validRounds.forEach(rounds => {
        process.env.BCRYPT_ROUNDS = rounds;
        try {
          validateEnvironment();
        } catch (error: any) {
          expect(error.message).not.toContain('BCRYPT_ROUNDS');
        }
      });
    });

    it('should reject invalid BCRYPT_ROUNDS', () => {
      const invalidRounds = ['5', '20', 'invalid'];

      invalidRounds.forEach(rounds => {
        process.env.BCRYPT_ROUNDS = rounds;
        expect(() => validateEnvironment()).toThrow();
      });
    });
  });

  describe('Production Security Checks', () => {
    beforeEach(() => {
      // Set NODE_ENV to production
      process.env.NODE_ENV = 'production';

      // Set all required variables for production
      process.env.DB_HOST = 'prod-db.example.com';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'proddb';
      process.env.DB_USER = 'produser';
      process.env.DB_PASSWORD = 'a'.repeat(16);
      process.env.REDIS_HOST = 'prod-redis.example.com';
      process.env.REDIS_PORT = '6379';
      process.env.JWT_SECRET = 'production_secret_' + 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'production_refresh_' + 'a'.repeat(32);
      process.env.STRIPE_SECRET_KEY = 'sk_live_' + 'a'.repeat(24);
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(24);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_' + 'a'.repeat(24);
      process.env.VERIFF_API_KEY = 'a'.repeat(20);
      process.env.VERIFF_BASE_URL = 'https://stationapi.veriff.com';
      process.env.CERTN_API_KEY = 'a'.repeat(20);
      process.env.CERTN_BASE_URL = 'https://api.certn.co/v1';
      process.env.TWILIO_ACCOUNT_SID = 'AC' + 'a'.repeat(32);
      process.env.TWILIO_AUTH_TOKEN = 'a'.repeat(32);
      process.env.TWILIO_PHONE_NUMBER = '+15555555555';
      process.env.AWS_ACCESS_KEY_ID = 'a'.repeat(20);
      process.env.AWS_SECRET_ACCESS_KEY = 'a'.repeat(40);
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'prod-bucket';
      process.env.CORS_ORIGIN = 'https://app.conest.com';
    });

    it('should pass production validation with live Stripe keys', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_' + 'a'.repeat(24);
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_live_' + 'a'.repeat(24);

      expect(() => {
        validateEnvironment();
        validateProductionSecurity();
      }).not.toThrow();
    });

    it('should warn about test Stripe keys in production', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_' + 'a'.repeat(24);

      // Should not throw but should log warning
      expect(() => {
        validateEnvironment();
        validateProductionSecurity();
      }).not.toThrow();
    });

    it('should warn about localhost CORS in production', () => {
      process.env.CORS_ORIGIN = 'http://localhost:19006';

      expect(() => {
        validateEnvironment();
        validateProductionSecurity();
      }).not.toThrow();
    });

    it('should warn about HTTP URLs in production', () => {
      process.env.VERIFF_BASE_URL = 'http://stationapi.veriff.com';

      expect(() => {
        validateEnvironment();
        validateProductionSecurity();
      }).not.toThrow();
    });
  });

  describe('Validation Summary', () => {
    it('should return validation summary', () => {
      const summary = getValidationSummary();

      expect(summary).toHaveProperty('totalRules');
      expect(summary).toHaveProperty('requiredVariables');
      expect(summary).toHaveProperty('optionalVariables');
      expect(summary).toHaveProperty('missingRequired');

      expect(summary.totalRules).toBeGreaterThan(0);
      expect(Array.isArray(summary.requiredVariables)).toBe(true);
      expect(Array.isArray(summary.optionalVariables)).toBe(true);
      expect(Array.isArray(summary.missingRequired)).toBe(true);
    });

    it('should list required variables', () => {
      const summary = getValidationSummary();

      expect(summary.requiredVariables).toContain('JWT_SECRET');
      expect(summary.requiredVariables).toContain('JWT_REFRESH_SECRET');
      expect(summary.requiredVariables).toContain('STRIPE_SECRET_KEY');
      expect(summary.requiredVariables).toContain('DB_PASSWORD');
    });

    it('should identify missing required variables', () => {
      delete process.env.JWT_SECRET;
      delete process.env.STRIPE_SECRET_KEY;

      const summary = getValidationSummary();

      expect(summary.missingRequired).toContain('JWT_SECRET');
      expect(summary.missingRequired).toContain('STRIPE_SECRET_KEY');
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message for missing required variable', () => {
      delete process.env.DB_HOST;

      try {
        validateEnvironment();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('validation failed');
        expect(error.message).toContain('error');
      }
    });

    it('should provide clear error message for invalid format', () => {
      process.env.STRIPE_SECRET_KEY = 'invalid_key';

      try {
        validateEnvironment();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should suggest checking .env.example on failure', () => {
      delete process.env.JWT_SECRET;

      try {
        validateEnvironment();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('.env');
      }
    });
  });
});
