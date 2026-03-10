/**
 * Mock Database Module for Unit/Contract Tests
 *
 * Provides a chainable mock knex instance that prevents real database
 * connections during unit testing. Individual tests can override specific
 * mock behaviors using jest.spyOn() or by re-mocking in their test file.
 *
 * This mock is auto-loaded for the 'unit' jest project via moduleNameMapper.
 * Integration tests use the real database via a separate jest project config.
 */

// Create a chainable mock that returns itself for any method call
const createChainableMock = (): any => {
  const mock: any = jest.fn().mockImplementation(() => chainProxy);

  const chainProxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined; // Prevent auto-promise resolution
        if (prop === 'toSQL') return () => ({ sql: '', bindings: [] });

        // Terminal methods that return promises
        const terminalMethods = [
          'first',
          'pluck',
          'count',
          'min',
          'max',
          'sum',
          'avg',
        ];
        if (terminalMethods.includes(prop as string)) {
          return jest.fn().mockResolvedValue(null);
        }

        // Return chainProxy for all other methods (select, where, join, etc.)
        return jest.fn().mockImplementation(() => chainProxy);
      },
    },
  );

  // Add common knex top-level methods
  mock.raw = jest.fn().mockResolvedValue({ rows: [] });
  mock.destroy = jest.fn().mockResolvedValue(undefined);
  mock.migrate = {
    latest: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };
  mock.schema = {
    hasTable: jest.fn().mockResolvedValue(true),
    createTable: jest.fn().mockResolvedValue(undefined),
    alterTable: jest.fn().mockResolvedValue(undefined),
    dropTable: jest.fn().mockResolvedValue(undefined),
    dropTableIfExists: jest.fn().mockResolvedValue(undefined),
  };
  mock.fn = {
    now: jest.fn().mockReturnValue('NOW()'),
  };
  mock.transaction = jest
    .fn()
    .mockImplementation(async (callback: any) => callback(mock));

  return mock;
};

const db = createChainableMock();

export default db;
export { db };
export const testConnection = jest.fn().mockResolvedValue(true);
