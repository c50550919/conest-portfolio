/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Fine-grained Authorization & Permissions Middleware
 * Implements RBAC and resource-level permissions
 *
 * Constitution Principle I: Child Safety
 * - preventChildDataAccess blocks any child-related data in requests
 * - Strict blocklist approach (not loose regex)
 */

import { Request, Response, NextFunction } from 'express';
import { HouseholdMemberModel } from '../models/HouseholdMember';
import logger from '../config/logger';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

/**
 * User object attached to request by auth middleware
 * Note: Uses 'id' field from database user record
 */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
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
    const hasPermission = permissions.every((p) => userPermissions.includes(p));

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
 *
 * SECURITY: Queries household_members table to verify membership.
 * Admins bypass this check for moderation purposes.
 */
export async function requireHouseholdMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = (req as any).user;
  const householdId = req.params.householdId || req.body?.householdId;

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

  // Validate UUID format to prevent injection
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(householdId)) {
    res.status(400).json({
      error: 'Invalid household ID format',
      code: 'INVALID_HOUSEHOLD_ID',
    });
    return;
  }

  // Admin bypass for moderation purposes
  if (user.role === Role.ADMIN) {
    next();
    return;
  }

  try {
    // Query database to verify membership
    const isMember = await HouseholdMemberModel.isMember(householdId, user.id);

    if (!isMember) {
      res.status(403).json({
        error: 'Not a household member',
        code: 'NOT_HOUSEHOLD_MEMBER',
      });
      return;
    }

    next();
  } catch (error) {
    // Log error but don't expose internal details
    logger.error('Household membership check failed', { error });
    res.status(500).json({
      error: 'Membership verification failed',
      code: 'MEMBERSHIP_CHECK_FAILED',
    });
  }
}

/**
 * Check if user is household admin
 *
 * SECURITY: Requires admin role within the household for sensitive operations
 * like managing members, updating household settings, or deleting the household.
 * Platform admins also bypass this check.
 */
export async function requireHouseholdAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = (req as any).user;
  const householdId = req.params.householdId || req.body?.householdId;

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

  // Validate UUID format
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(householdId)) {
    res.status(400).json({
      error: 'Invalid household ID format',
      code: 'INVALID_HOUSEHOLD_ID',
    });
    return;
  }

  // Platform admin bypass
  if (user.role === Role.ADMIN) {
    next();
    return;
  }

  try {
    // Query database to verify admin role within household
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, user.id);

    if (!isAdmin) {
      res.status(403).json({
        error: 'Household admin privileges required',
        code: 'NOT_HOUSEHOLD_ADMIN',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Household admin check failed', { error });
    res.status(500).json({
      error: 'Admin verification failed',
      code: 'ADMIN_CHECK_FAILED',
    });
  }
}

/**
 * CHILD SAFETY BLOCKLIST
 *
 * Constitution Principle I: Child Safety - NO child PII
 * Strict blocklist of keys that indicate child-specific data.
 * Uses exact match and prefix/suffix patterns for security.
 */
const CHILD_DATA_BLOCKLIST = new Set([
  // Direct child references
  'child',
  'children',
  'child_id',
  'child_ids',
  'childid',
  'childids',
  'child_name',
  'child_names',
  'childname',
  'childnames',
  'child_age',
  'child_ages',
  'childage',
  'childages',
  'child_dob',
  'child_birthday',
  'childdob',
  'childbirthday',
  'child_photo',
  'child_photos',
  'childphoto',
  'childphotos',
  'child_profile',
  'child_profiles',
  'childprofile',
  'childprofiles',
  'child_info',
  'child_data',
  'childinfo',
  'childdata',
  'child_school',
  'child_schools',
  'childschool',
  'childschools',
  'child_medical',
  'childmedical',

  // Kid variations
  'kid',
  'kids',
  'kid_id',
  'kid_ids',
  'kidid',
  'kidids',
  'kid_name',
  'kid_names',
  'kidname',
  'kidnames',
  'kid_age',
  'kid_ages',
  'kidage',
  'kidages',
  'kid_photo',
  'kid_photos',
  'kidphoto',
  'kidphotos',

  // Minor variations
  'minor',
  'minors',
  'minor_id',
  'minor_ids',
  'minorid',
  'minorids',
  'minor_name',
  'minor_names',
  'minorname',
  'minornames',
  'minor_age',
  'minor_ages',
  'minorage',
  'minorages',

  // Dependent variations
  'dependent_name',
  'dependent_names',
  'dependentname',
  'dependentnames',
  'dependent_age',
  'dependent_ages',
  'dependentage',
  'dependentages',
  'dependent_dob',
  'dependentdob',

  // Son/daughter explicit references
  'son_name',
  'daughter_name',
  'sonname',
  'daughtername',
  'son_age',
  'daughter_age',
  'sonage',
  'daughterage',
]);

/**
 * Patterns that indicate child data when found as prefix/suffix
 * These catch variations like 'myChildName', 'child_1_name', etc.
 *
 * IMPORTANT: These patterns catch PII-indicating field names.
 * Aggregate fields like 'children_count' and 'children_age_groups' are ALLOWED.
 */
const CHILD_DATA_PATTERNS = [
  // Numbered children (child_1, child-2, child1)
  /^child[_-]?\d/i,
  /^kid[_-]?\d/i,
  /^minor[_-]?\d/i,
  /^(son|daughter)[_-]?\d/i,

  // CamelCase PII patterns (childName, kidAge, minorPhoto)
  /child(name|age|dob|photo|school|medical|profile|info|data|id)/i,
  /kid(name|age|dob|photo|school|profile|info|data|id)/i,
  /minor(name|age|dob|photo|school|profile|info|data|id)/i,

  // Underscore/hyphen PII patterns
  /child[_-](name|age|dob|photo|school|medical|profile|info|data)/i,
  /kid[_-](name|age|dob|photo|school|profile|info|data)/i,
  /minor[_-](name|age|dob|photo|profile|info|data)/i,

  // Reversed patterns (nameChild, ageKid)
  /(first|last|full)[_-]?name[_-]?(child|kid|minor)/i,
  /(name|age|photo|profile)[_-]?(child|kid|minor)$/i,
];

/**
 * Check if a key represents child-related data
 */
function isChildDataKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().trim();

  // Exact match against blocklist (O(1) lookup)
  if (CHILD_DATA_BLOCKLIST.has(normalizedKey)) {
    return true;
  }

  // Pattern matching for variations
  return CHILD_DATA_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

/**
 * Recursively extract all keys from an object (handles nested structures)
 */
function extractAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(key); // Add the key itself
    keys.push(fullKey); // Add the full path

    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractAllKeys(value as Record<string, unknown>, fullKey));
    }
  }

  return keys;
}

/**
 * Check if user can access child-related data (NEVER - children don't have profiles)
 *
 * Constitution Principle I: Child Safety
 * This platform DOES NOT store or process child-specific PII.
 * Only generic aggregate data allowed (children_count, children_age_groups).
 *
 * SECURITY: Uses strict blocklist + pattern matching instead of loose regex.
 */
export function preventChildDataAccess(req: Request, res: Response, next: NextFunction): void {
  const body = req.body || {};
  const query = req.query || {};
  const params = req.params || {};

  // Extract all keys including nested objects
  const allKeys = [
    ...extractAllKeys(body as Record<string, unknown>),
    ...Object.keys(query),
    ...Object.keys(params),
  ];

  // Check each key against blocklist and patterns
  const blockedKey = allKeys.find((key) => isChildDataKey(key));

  if (blockedKey) {
    // Log attempt for security monitoring (tokenized)
    logger.warn('Blocked child data access attempt', { blockedKey, type: 'CHILD_SAFETY' });

    res.status(400).json({
      error: 'Child data access forbidden',
      code: 'CHILD_DATA_FORBIDDEN',
      message:
        'This platform does not store or process child-specific data. Only aggregate family information (children_count, children_age_groups) is permitted.',
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
