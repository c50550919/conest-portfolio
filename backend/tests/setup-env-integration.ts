/**
 * Jest Environment Setup for Integration Tests
 *
 * Purpose: Set environment variables for integration tests using real DB/Redis
 * These must match docker-compose.test.yml container configuration
 *
 * This runs BEFORE any modules are loaded via Jest's setupFiles
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SECURITY_MODE = 'testing';

// Database configuration - matches docker-compose.test.yml
process.env.DB_HOST = '127.0.0.1';     // Use IPv4 to avoid IPv6 issues
process.env.DB_PORT = '5433';           // Test container mapped port (not 5432!)
process.env.DB_NAME = 'conest_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Redis configuration - matches docker-compose.test.yml
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6380';        // Test container mapped port
process.env.REDIS_PASSWORD = 'test_redis_password';

// JWT secrets for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests';

// Stripe test mode
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

// AWS S3 mock
process.env.AWS_S3_BUCKET = 'test-bucket-for-testing';

// Disable features that interfere with tests
process.env.ENABLE_RATE_LIMITING = 'false';
process.env.ENABLE_CSRF_PROTECTION = 'false';
process.env.ENABLE_ACCOUNT_LOCKOUT = 'false';
