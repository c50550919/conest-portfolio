/**
 * Jest Environment Setup - Runs BEFORE any modules are loaded
 *
 * Purpose: Set environment variables that affect module initialization
 * Note: This runs before setupFilesAfterEnv, ensuring NODE_ENV is set
 *       before database connections are created
 */

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.SECURITY_MODE = 'testing';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-32ch';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing_only';
process.env.AWS_S3_BUCKET = 'test-bucket-for-testing';
process.env.ENCRYPTION_MASTER_KEY = 'test-encryption-master-key-32chars!';

// Disable rate limiting and other features that interfere with tests
process.env.ENABLE_RATE_LIMITING = 'false';
process.env.ENABLE_CSRF_PROTECTION = 'false';
process.env.ENABLE_ACCOUNT_LOCKOUT = 'false';

// Database configuration for unit tests (mocked, but needs valid-looking config)
// Note: Integration tests override these in setup-integration.ts with real test container values
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1'; // Use IPv4 to avoid IPv6 issues
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'safenest_db';
process.env.DB_USER = process.env.DB_USER || 'safenest';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';

// Redis configuration (matches docker container - external port 6380)
process.env.REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6380';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
