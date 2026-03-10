/**
 * Jest Configuration
 *
 * Uses Jest projects to separate unit/contract tests from integration tests.
 * Integration tests use real DB/Redis connections via setup-integration.ts.
 *
 * Commands:
 *   npm test                    - Run all unit/contract tests
 *   npm run test:integration    - Run integration tests (requires docker-compose.test.yml)
 *   npm run test:all            - Run all tests
 */

const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
  },
};

module.exports = {
  // Use projects for different test types
  projects: [
    // Unit & Contract Tests (default - mocked dependencies)
    {
      ...baseConfig,
      displayName: 'unit',
      roots: ['<rootDir>/src', '<rootDir>/tests'],
      testMatch: [
        '**/tests/**/*.test.ts',
        '**/?(*.)+(spec|test).ts',
        '!**/tests/e2e/**',
        '!**/tests/integration/**',
        '!**/tests/security/**',
        '!**/tests/performance/**',
        '!**/*.integration.test.ts',
      ],
      setupFiles: ['<rootDir>/tests/setup-env.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 10000,
      moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Auto-mock auth middleware for unit tests
        '^(.*)/middleware/auth\\.middleware$': '<rootDir>/src/middleware/__mocks__/auth.middleware.ts',
      },
    },
    // Integration Tests (real DB/Redis)
    {
      ...baseConfig,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration'],
      testMatch: [
        '**/tests/integration/**/*.test.ts',
        '**/*.integration.test.ts',
      ],
      // Use dedicated env setup for integration tests with real container settings
      setupFiles: ['<rootDir>/tests/setup-env-integration.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts'],
      testTimeout: 30000,
      // DO NOT mock auth middleware for integration tests - use real auth
    },
  ],

  // Coverage configuration (applies to all projects)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/migrations/**',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // 100% coverage required for child safety compliance modules
    'src/validators/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  verbose: true,
};
