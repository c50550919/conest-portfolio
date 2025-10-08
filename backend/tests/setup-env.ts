/**
 * Jest Environment Setup - Runs BEFORE any modules are loaded
 *
 * Purpose: Set environment variables that affect module initialization
 * Note: This runs before setupFilesAfterEnv, ensuring NODE_ENV is set
 *       before database connections are created
 */

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing_only';

// Database configuration (test container)
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'conest_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Redis configuration (test container)
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';
process.env.REDIS_PASSWORD = 'test_redis_password';
