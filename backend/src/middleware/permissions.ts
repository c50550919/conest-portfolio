/**
 * Fine-grained Authorization & Permissions Middleware
 * Implements RBAC and resource-level permissions
 */

import { Request, Response, NextFunction } from 'express';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Profile permissions
  PROFILE_READ = 'profile:read',
  PROFILE_WRITE = 'profile:write',

  // Verification permissions
  VERIFICATION_READ = 'verification:read',
  VERIFICATION_WRITE = 'verification:write',
  VERIFICATION_APPROVE = 'verification:approve',

  // Match permissions
  MATCH_READ = 'match:read',
  MATCH_WRITE = 'match:write',
  MATCH_DELETE = 'match:delete',

  // Household permissions
  HOUSEHOLD_READ = 'household:read',
  HOUSEHOLD_WRITE = 'household:write',
  HOUSEHOLD_DELETE = 'household:delete',
  HOUSEHOLD_MANAGE_MEMBERS = 'household:manage_members',

  // Payment permissions
  PAYMENT_READ = 'payment:read',
  PAYMENT_WRITE = 'payment:write',

  // Admin permissions
  ADMIN_READ = 'admin:read',
  ADMIN_WRITE = 'admin:write',
  ADMIN_DELETE = 'admin:delete',
}

// Role-to-permissions mapping
const rolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.USER_READ,
    Permission.PROFILE_READ,
    Permission.PROFILE_WRITE,
    Permission.VERIFICATION_READ,
    Permission.MATCH_READ,
    Permission.MATCH_WRITE,
    Permission.HOUSEHOLD_READ,
    Permission.HOUSEHOLD_WRITE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_WRITE,
  ],
  [Role.MODERATOR]: [
    Permission.USER_READ,
    Permission.PROFILE_READ,
    Permission.VERIFICATION_READ,
    Permission.VERIFICATION_APPROVE,
    Permission.MATCH_READ,
    Permission.ADMIN_READ,
  ],
  [Role.ADMIN]: Object.values(Permission), // All permissions
};

/**
 * Check if user has required role
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
      });
      return;
    }

    next();
  };
}

/**
 * Check if user has required permission
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    const userPermissions = rolePermissions[user.role as Role] || [];
    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
      });
      return;
    }

    next();
  };
}

/**
 * Check if user owns the resource
 */
export function requireOwnership(resourceIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];

    if (!resourceId) {
      res.status(400).json({
        error: 'Resource ID not provided',
        code: 'RESOURCE_ID_MISSING',
      });
      return;
    }

    // Allow if user is admin or owns the resource
    if (user.role === Role.ADMIN || user.id === resourceId) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Access denied',
      code: 'ACCESS_DENIED',
    });
  };
}

/**
 * Check if user is household member
 */
export async function requireHouseholdMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = (req as any).user;
  const householdId = req.params.householdId;

  if (!user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED',
    });
    return;
  }

  if (!householdId) {
    res.status(400).json({
      error: 'Household ID not provided',
      code: 'HOUSEHOLD_ID_MISSING',
    });
    return;
  }

  // TODO: Implement database query to check membership
  // For now, assume user has access
  // In production, query database:
  // const isMember = await checkHouseholdMembership(user.id, householdId);

  const isMember = true; // Placeholder

  if (!isMember && user.role !== Role.ADMIN) {
    res.status(403).json({
      error: 'Not a household member',
      code: 'NOT_HOUSEHOLD_MEMBER',
    });
    return;
  }

  next();
}

/**
 * Check if user can access child-related data (NEVER - children don't have profiles)
 */
export function preventChildDataAccess(req: Request, res: Response, next: NextFunction): void {
  // This is a safety middleware to ensure no child data is ever accessed
  const body = req.body || {};
  const query = req.query || {};
  const params = req.params || {};

  const allData = { ...body, ...query, ...params };
  const hasChildData = Object.keys(allData).some(key =>
    key.toLowerCase().includes('child') ||
    key.toLowerCase().includes('kid') ||
    key.toLowerCase().includes('minor'),
  );

  if (hasChildData) {
    res.status(400).json({
      error: 'Child data access forbidden',
      code: 'CHILD_DATA_FORBIDDEN',
      message: 'This platform does not store or process child data',
    });
    return;
  }

  next();
}

/**
 * Check user permissions based on custom logic
 */
export function requireCustomPermission(
  checkFn: (req: Request, user: any) => Promise<boolean> | boolean,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    try {
      const hasPermission = await checkFn(req, user);

      if (!hasPermission) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED',
      });
      return;
    }
  };
}
