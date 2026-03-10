// @ts-nocheck
/**
 * Permissions Middleware Unit Tests
 *
 * Critical Security Tests for RBAC and Resource-Level Permissions
 * Tests: requireRole, requirePermission, requireOwnership, requireHouseholdMembership,
 *        preventChildDataAccess, requireCustomPermission
 */

import { Request, Response, NextFunction } from 'express';
import {
  Role,
  Permission,
  requireRole,
  requirePermission,
  requireOwnership,
  requireHouseholdMembership,
  preventChildDataAccess,
  requireCustomPermission,
} from '../../../src/middleware/permissions';

// Mock HouseholdMemberModel for database-independent testing
jest.mock('../../../src/models/HouseholdMember', () => ({
  HouseholdMemberModel: {
    isMember: jest.fn(),
    isAdmin: jest.fn(),
  },
}));

import { HouseholdMemberModel } from '../../../src/models/HouseholdMember';
const mockHouseholdMemberModel = HouseholdMemberModel;

// Helper functions for creating mock request/response
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Permissions Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Enum', () => {
    it('should define all expected roles', () => {
      expect(Role.USER).toBe('user');
      expect(Role.ADMIN).toBe('admin');
      expect(Role.MODERATOR).toBe('moderator');
    });
  });

  describe('Permission Enum', () => {
    it('should define user permissions', () => {
      expect(Permission.USER_READ).toBe('user:read');
      expect(Permission.USER_WRITE).toBe('user:write');
      expect(Permission.USER_DELETE).toBe('user:delete');
    });

    it('should define profile permissions', () => {
      expect(Permission.PROFILE_READ).toBe('profile:read');
      expect(Permission.PROFILE_WRITE).toBe('profile:write');
    });

    it('should define verification permissions', () => {
      expect(Permission.VERIFICATION_READ).toBe('verification:read');
      expect(Permission.VERIFICATION_WRITE).toBe('verification:write');
      expect(Permission.VERIFICATION_APPROVE).toBe('verification:approve');
    });

    it('should define admin permissions', () => {
      expect(Permission.ADMIN_READ).toBe('admin:read');
      expect(Permission.ADMIN_WRITE).toBe('admin:write');
      expect(Permission.ADMIN_DELETE).toBe('admin:delete');
    });
  });

  describe('requireRole', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requireRole(Role.USER);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      const middleware = requireRole(Role.ADMIN);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: [Role.ADMIN],
      });
    });

    it('should call next when user has required role', () => {
      const middleware = requireRole(Role.USER);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept any of multiple roles', () => {
      const middleware = requireRole(Role.ADMIN, Role.MODERATOR);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'moderator' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject user without any of the required roles', () => {
      const middleware = requireRole(Role.ADMIN, Role.MODERATOR);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: [Role.ADMIN, Role.MODERATOR],
      });
    });
  });

  describe('requirePermission', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requirePermission(Permission.USER_READ);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next when USER has basic permissions', () => {
      const middleware = requirePermission(Permission.PROFILE_READ);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when USER lacks ADMIN permissions', () => {
      const middleware = requirePermission(Permission.ADMIN_READ);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: [Permission.ADMIN_READ],
      });
    });

    it('should call next when ADMIN has all permissions', () => {
      const middleware = requirePermission(Permission.ADMIN_DELETE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'admin' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should require all specified permissions', () => {
      const middleware = requirePermission(Permission.PROFILE_READ, Permission.PROFILE_WRITE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject when missing any required permission', () => {
      const middleware = requirePermission(Permission.PROFILE_READ, Permission.ADMIN_READ);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle unknown role gracefully', () => {
      const middleware = requirePermission(Permission.PROFILE_READ);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'unknown' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow MODERATOR to approve verifications', () => {
      const middleware = requirePermission(Permission.VERIFICATION_APPROVE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'moderator' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireOwnership', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requireOwnership();
      const req = createMockRequest({ params: { userId: 'user-123' } }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when resource ID is missing', () => {
      const middleware = requireOwnership();
      const req = createMockRequest({ params: {} }) as Request;
      (req as any).user = { id: 'user-123', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Resource ID not provided',
        code: 'RESOURCE_ID_MISSING',
      });
    });

    it('should call next when user owns the resource', () => {
      const middleware = requireOwnership();
      const req = createMockRequest({ params: { userId: 'user-123' } }) as Request;
      (req as any).user = { id: 'user-123', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should call next when user is admin even if not owner', () => {
      const middleware = requireOwnership();
      const req = createMockRequest({ params: { userId: 'user-456' } }) as Request;
      (req as any).user = { id: 'admin-123', role: 'admin' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when user does not own resource', () => {
      const middleware = requireOwnership();
      const req = createMockRequest({ params: { userId: 'user-456' } }) as Request;
      (req as any).user = { id: 'user-123', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    });

    it('should use custom resource ID parameter', () => {
      const middleware = requireOwnership('profileId');
      const req = createMockRequest({ params: { profileId: 'user-123' } }) as Request;
      (req as any).user = { id: 'user-123', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireHouseholdMembership', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = createMockRequest({ params: { householdId: 'household-123' } }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireHouseholdMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when household ID is missing', async () => {
      const req = createMockRequest({ params: {} }) as Request;
      (req as any).user = { id: 'user-123', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireHouseholdMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Household ID not provided',
        code: 'HOUSEHOLD_ID_MISSING',
      });
    });

    it('should call next when user is verified household member', async () => {
      const householdId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const req = createMockRequest({ params: { householdId } }) as Request;
      (req as any).user = { id: userId, role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock database returns user is a member
      mockHouseholdMemberModel.isMember.mockResolvedValue(true);

      await requireHouseholdMembership(req, res, next);

      expect(mockHouseholdMemberModel.isMember).toHaveBeenCalledWith(householdId, userId);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when user is NOT a household member', async () => {
      const householdId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const req = createMockRequest({ params: { householdId } }) as Request;
      (req as any).user = { id: userId, role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock database returns user is NOT a member
      mockHouseholdMemberModel.isMember.mockResolvedValue(false);

      await requireHouseholdMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not a household member',
        code: 'NOT_HOUSEHOLD_MEMBER',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin access regardless of membership (bypasses DB check)', async () => {
      const householdId = '550e8400-e29b-41d4-a716-446655440000';
      const req = createMockRequest({ params: { householdId } }) as Request;
      (req as any).user = { id: '550e8400-e29b-41d4-a716-446655440002', role: 'admin' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireHouseholdMembership(req, res, next);

      // Admin bypasses DB check entirely
      expect(mockHouseholdMemberModel.isMember).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid UUID format', async () => {
      const req = createMockRequest({ params: { householdId: 'not-a-uuid' } }) as Request;
      (req as any).user = { id: '550e8400-e29b-41d4-a716-446655440001', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireHouseholdMembership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid household ID format',
        code: 'INVALID_HOUSEHOLD_ID',
      });
    });
  });

  describe('preventChildDataAccess', () => {
    it('should call next when no child-related data is present', () => {
      const req = createMockRequest({
        body: { name: 'Test User' },
        query: { page: '1' },
        params: { userId: '123' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block request with child PII key in body', () => {
      const req = createMockRequest({
        body: { childName: 'Test Child' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Child data access forbidden',
        code: 'CHILD_DATA_FORBIDDEN',
        message:
          'This platform does not store or process child-specific data. Only aggregate family information (children_count, children_age_groups) is permitted.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block request with "kid" in query', () => {
      const req = createMockRequest({
        query: { kidId: '123' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should block request with minor PII key in params', () => {
      const req = createMockRequest({
        params: { minorProfile: 'abc' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CHILD_DATA_FORBIDDEN',
        }),
      );
    });

    it('should be case-insensitive for child PII detection', () => {
      const req = createMockRequest({
        body: { CHILD_AGE: 5 }, // Specific child's age = PII
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CHILD_DATA_FORBIDDEN',
        }),
      );
    });

    it('should handle empty request data gracefully', () => {
      const req = createMockRequest({
        body: undefined,
        query: undefined,
        params: undefined,
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should ALLOW aggregate child data like "numberOfChildren" or "children_count"', () => {
      // Aggregate data about children (count, age groups) is allowed
      // Only child-specific PII (names, photos, specific ages) is blocked
      const req = createMockRequest({
        body: {
          numberOfChildren: 2,
          children_count: 3,
          children_age_groups: ['toddler', 'elementary'],
        },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireCustomPermission', () => {
    it('should return 401 when user is not authenticated', async () => {
      const customCheck = jest.fn().mockResolvedValue(true);
      const middleware = requireCustomPermission(customCheck);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(customCheck).not.toHaveBeenCalled();
    });

    it('should call next when custom check returns true', async () => {
      const customCheck = jest.fn().mockResolvedValue(true);
      const middleware = requireCustomPermission(customCheck);
      const req = createMockRequest() as Request;
      (req as any).user = { id: 'user-123' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await middleware(req, res, next);

      expect(customCheck).toHaveBeenCalledWith(req, { id: 'user-123' });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when custom check returns false', async () => {
      const customCheck = jest.fn().mockResolvedValue(false);
      const middleware = requireCustomPermission(customCheck);
      const req = createMockRequest() as Request;
      (req as any).user = { id: 'user-123' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    });

    it('should return 500 when custom check throws error', async () => {
      const customCheck = jest.fn().mockRejectedValue(new Error('Check failed'));
      const middleware = requireCustomPermission(customCheck);
      const req = createMockRequest() as Request;
      (req as any).user = { id: 'user-123' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED',
      });
    });

    it('should support synchronous custom check function', async () => {
      const customCheck = jest.fn().mockReturnValue(true);
      const middleware = requireCustomPermission(customCheck);
      const req = createMockRequest() as Request;
      (req as any).user = { id: 'user-123' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should pass request object to custom check for context', async () => {
      const customCheck = jest.fn().mockImplementation(
        (req, user) =>
          // Check if user can access a specific resource based on request params
          req.params.resourceId === user.ownedResourceId,
      );
      const middleware = requireCustomPermission(customCheck);
      const req = createMockRequest({ params: { resourceId: 'res-456' } }) as Request;
      (req as any).user = { id: 'user-123', ownedResourceId: 'res-456' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role-Permission Matrix Integration', () => {
    it('USER should have profile permissions', () => {
      const middleware = requirePermission(Permission.PROFILE_READ, Permission.PROFILE_WRITE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('USER should not have admin permissions', () => {
      const middleware = requirePermission(Permission.ADMIN_WRITE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('MODERATOR should have verification approve permission', () => {
      const middleware = requirePermission(Permission.VERIFICATION_APPROVE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'moderator' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('MODERATOR should not have user delete permission', () => {
      const middleware = requirePermission(Permission.USER_DELETE);
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'moderator' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('ADMIN should have all permissions', () => {
      const middleware = requirePermission(
        Permission.USER_DELETE,
        Permission.ADMIN_DELETE,
        Permission.VERIFICATION_APPROVE,
        Permission.HOUSEHOLD_MANAGE_MEMBERS,
      );
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'admin' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
