/**
 * Jest Test Setup
 * Global setup and teardown for all tests
 */

import { createClient } from 'redis';

// Mock Redis client for tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    sAdd: jest.fn(),
    sRem: jest.fn(),
    sMembers: jest.fn(),
    zAdd: jest.fn(),
    zRange: jest.fn(),
    zRemRangeByScore: jest.fn(),
    ttl: jest.fn(),
    multi: jest.fn(() => ({
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn(),
    })),
    on: jest.fn(),
  })),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_MASTER_KEY = 'test-encryption-master-key-32chars';
process.env.TOKENIZATION_SECRET = 'test-tokenization-secret';
process.env.REDIS_URL = 'redis://localhost:6379';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Global setup
beforeAll(async () => {
  // Setup test database connection if needed
  console.log('Setting up test environment...');
});

// Global teardown
afterAll(async () => {
  // Cleanup test database if needed
  console.log('Tearing down test environment...');
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
