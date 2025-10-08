/**
 * Jest Global Setup
 *
 * Purpose: Configure test environment before running test suite
 * Runs once before all tests
 */

// Database and Redis mocks removed - integration tests use real connections.
// Unit tests can mock these individually as needed using jest.mock() in each test file.

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing_only';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5433/conest_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6380';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'test_redis_password';

// Increase timeout for integration/E2E tests
jest.setTimeout(30000);

// Mock console methods to reduce test output noise (optional)
if (process.env.VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(), // Suppress console.log
    debug: jest.fn(), // Suppress console.debug
    info: jest.fn(), // Suppress console.info
    warn: console.warn, // Keep warnings
    error: console.error, // Keep errors
  };
}

// Handle unhandled rejections in tests
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection in test:', error);
  throw error;
});

// Export empty object to satisfy TypeScript
export {};
