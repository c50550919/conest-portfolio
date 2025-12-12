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
} from '../../middleware/permissions';

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

    it('should call next when user is household member (placeholder implementation)', async () => {
      const req = createMockRequest({ params: { householdId: 'household-123' } }) as Request;
      (req as any).user = { id: 'user-123', role: 'user' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireHouseholdMembership(req, res, next);

      // Current implementation always allows (isMember = true placeholder)
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow admin access regardless of membership', async () => {
      const req = createMockRequest({ params: { householdId: 'household-123' } }) as Request;
      (req as any).user = { id: 'admin-123', role: 'admin' };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await requireHouseholdMembership(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
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

    it('should block request with "child" in body', () => {
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
        message: 'This platform does not store or process child data',
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

    it('should block request with "minor" in params', () => {
      const req = createMockRequest({
        params: { minorProfile: 'abc' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should be case-insensitive for child data detection', () => {
      const req = createMockRequest({
        body: { CHILD_AGE: 5 },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
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

    it('should block "numberOfChildren" as it contains "child"', () => {
      const req = createMockRequest({
        body: { numberOfChildren: 2 },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      preventChildDataAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
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
      const customCheck = jest.fn().mockImplementation((req, user) => {
        // Check if user can access a specific resource based on request params
        return req.params.resourceId === user.ownedResourceId;
      });
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
        Permission.HOUSEHOLD_MANAGE_MEMBERS
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
