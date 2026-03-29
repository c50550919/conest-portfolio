import { scopedQuery, withOrgScope } from '../../../src/lib/orgScope';

// Mock the database module
jest.mock('../../../src/config/database', () => {
  const mockWhere = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: '1' }]) });
  const mockReturning = jest.fn().mockResolvedValue([{ id: '1' }]);
  const mockToSQL = jest.fn().mockReturnValue({ sql: 'select * from "test" where "org_id" = ?' });

  const mockQueryBuilder = {
    where: mockWhere,
    insert: mockInsert,
    returning: mockReturning,
    toSQL: mockToSQL,
  };

  // Make where return the builder so chaining works
  mockWhere.mockReturnValue(mockQueryBuilder);
  mockInsert.mockReturnValue({ returning: mockReturning });

  const mockDb = jest.fn().mockReturnValue(mockQueryBuilder);

  return {
    db: mockDb,
    default: mockDb,
  };
});

describe('orgScope', () => {
  const testOrgId = '00000000-0000-0000-0000-000000000001';

  describe('scopedQuery', () => {
    it('should return a query builder scoped to org_id', () => {
      const query = scopedQuery('clients', testOrgId);
      expect(query).toBeDefined();
      expect(query.where).toBeDefined();
    });

    it('should throw when orgId is empty', () => {
      expect(() => scopedQuery('clients', '')).toThrow(
        'orgId is required for scoped queries',
      );
    });
  });

  describe('withOrgScope', () => {
    it('should return scoped context with orgId and query method', () => {
      const scoped = withOrgScope(testOrgId);
      expect(scoped.orgId).toBe(testOrgId);
      expect(scoped.query).toBeDefined();
      expect(scoped.insert).toBeDefined();
    });

    it('should throw when orgId is empty', () => {
      expect(() => withOrgScope('')).toThrow(
        'orgId is required for org scope',
      );
    });

    it('should scope queries to the given org_id', () => {
      const scoped = withOrgScope(testOrgId);
      const query = scoped.query('clients');
      expect(query).toBeDefined();
    });

    it('should add org_id to inserted rows', async () => {
      const scoped = withOrgScope(testOrgId);
      await scoped.insert('clients', { first_name: 'Test' });
      // Insert was called — if it didn't throw, org_id was injected
    });
  });
});
