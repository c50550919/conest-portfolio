/**
 * Mock Auth Middleware for Testing
 *
 * Purpose: Automatically mocked auth middleware for contract tests
 * This file is used by Jest's moduleNameMapper to replace auth.middleware imports
 *
 * Supports:
 * - Valid JWTs signed with test secret
 * - Legacy mock tokens ('mock-jwt-token', 'mock-token-{userId}')
 * - Bearer token extraction from Authorization header
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// Define AuthRequest interface directly to avoid circular import
export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  email?: string;
  jwtPayload?: {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
  };
  file?: Express.Multer.File;
}

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

/**
 * Default mock user for tests
 */
const defaultMockUser = {
  id: '64c31337-4e0f-4a41-b537-db546f26ffee',
  email: 'test@example.com',
  account_status: 'active',
  email_verified: true,
  phone_verified: true,
  id_verified: true,
  background_check_complete: true,
  role: 'user',
};

/**
 * Mock user configurations for different test scenarios
 * Maps token suffix to user state
 */
const mockUserConfigs: Record<string, Partial<typeof defaultMockUser>> = {
  // Verification states
  'verified-paid': { id_verified: true, background_check_complete: true },
  'under-review': { id_verified: false, background_check_complete: false },
  'unpaid': { id_verified: false, background_check_complete: false },
  'paid': { id_verified: true, background_check_complete: true },
  'unverified': { id_verified: false, background_check_complete: false, email_verified: false },
  'paid-not-verified': { id_verified: false, background_check_complete: false },
  'new-user': { id_verified: false, background_check_complete: false, email_verified: false, phone_verified: false },

  // User variants
  'other-user': { id: '64c31337-4e0f-4a41-b537-db546f26ff01', email: 'other@example.com' },
  'other': { id: '64c31337-4e0f-4a41-b537-db546f26ff02', email: 'other2@example.com' },
  'user-a': { id: '64c31337-4e0f-4a41-b537-db546f26ffa1', email: 'user-a@example.com' },
  'user-b': { id: '64c31337-4e0f-4a41-b537-db546f26ffb2', email: 'user-b@example.com' },
  'user-c': { id: '64c31337-4e0f-4a41-b537-db546f26ffc3', email: 'user-c@example.com' },

  // Admin roles
  'admin': { role: 'admin', id: '64c31337-4e0f-4a41-b537-admin00001' },
  'non-admin-member': { role: 'user' },
  'external-user': { id: '64c31337-4e0f-4a41-b537-external001', email: 'external@example.com' },

  // Household roles
  'household-admin': { role: 'admin', id: '64c31337-4e0f-4a41-b537-hadmin00001' },
  'household-member': { id: '64c31337-4e0f-4a41-b537-hmember0001' },
  'non-member': { id: '64c31337-4e0f-4a41-b537-nonmember01', email: 'nonmember@example.com' },

  // Special cases
  'rate-limited': { id: '64c31337-4e0f-4a41-b537-ratelimit01' },

  // Verification status variations
  'incomplete': { id_verified: false, background_check_complete: false, email_verified: true, phone_verified: true },
  'pending-id': { id_verified: false, background_check_complete: true },
  'pending-background': { id_verified: true, background_check_complete: false },
  'rejected-background': { id_verified: true, background_check_complete: false },
  'consider-background': { id_verified: true, background_check_complete: false },
};

/**
 * Get mock user based on token suffix
 */
function getMockUserForToken(token: string): typeof defaultMockUser {
  // Check for mock-jwt-token-{suffix} pattern
  const suffixMatch = token.match(/^mock-jwt-token-(.+)$/);
  if (suffixMatch) {
    const suffix = suffixMatch[1];
    const config = mockUserConfigs[suffix];
    if (config) {
      return { ...defaultMockUser, ...config };
    }
  }
  return defaultMockUser;
}

/**
 * Create mock auth middleware
 * Handles both valid JWTs and legacy mock tokens
 */
const createMockAuthMiddleware = (mockUser = defaultMockUser) => async (req: any, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required - Access token is missing',
    });
    return;
  }

  // Try to decode the token to get user info
  try {
    const decoded = jwt.verify(token, TEST_JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.email = decoded.email;
    req.user = {
      ...mockUser,
      id: decoded.userId,
      email: decoded.email,
    };
    req.jwtPayload = decoded;
    next();
  } catch (error) {
    // If token is invalid, check if it's a mock token pattern
    if (token.startsWith('mock-token-')) {
      const userId = token.replace('mock-token-', '');
      req.userId = userId;
      req.email = mockUser.email;
      req.user = { ...mockUser, id: userId };
      req.jwtPayload = { userId, email: mockUser.email };
      next();
    } else if (token.startsWith('mock-jwt-token')) {
      // Handle all mock-jwt-token-{suffix} patterns
      const user = getMockUserForToken(token);
      req.userId = user.id;
      req.email = user.email;
      req.user = user;
      req.jwtPayload = { userId: user.id, email: user.email };
      next();
    } else {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid authentication token',
      });
      return;
    }
  }
};

/**
 * Mock JWT Authentication Middleware
 */
export const authenticateJWT = createMockAuthMiddleware();

/**
 * Legacy authentication function (deprecated)
 */
export const authenticate = createMockAuthMiddleware();

/**
 * Optional JWT Authentication Middleware
 * Attaches user data if token is valid, but doesn't fail if missing
 */
export async function authenticateJWTOptional(
  req: any,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as { userId: string; email: string };
      req.userId = decoded.userId;
      req.email = decoded.email;
      req.user = { ...defaultMockUser, id: decoded.userId, email: decoded.email };
      req.jwtPayload = decoded;
    } catch {
      // Check for mock token patterns
      if (token.startsWith('mock-token-')) {
        const userId = token.replace('mock-token-', '');
        req.userId = userId;
        req.email = defaultMockUser.email;
        req.user = { ...defaultMockUser, id: userId };
      } else if (token.startsWith('mock-jwt-token')) {
        // Handle all mock-jwt-token-{suffix} patterns
        const user = getMockUserForToken(token);
        req.userId = user.id;
        req.email = user.email;
        req.user = user;
      }
    }
  }
  next();
}

/**
 * Require email verification middleware
 */
export function requireEmailVerification(
  req: any,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in first',
    });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this resource',
    });
    return;
  }

  next();
}

/**
 * Require phone verification middleware
 */
export function requirePhoneVerification(
  req: any,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in first',
    });
    return;
  }

  if (!req.user.phone_verified) {
    res.status(403).json({
      error: 'Phone verification required',
      message: 'Please verify your phone number to access this resource',
    });
    return;
  }

  next();
}

/**
 * Require full verification (ID + background check)
 */
export function requireFullVerification(
  req: any,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in first',
    });
    return;
  }

  if (!req.user.id_verified || !req.user.background_check_complete) {
    res.status(403).json({
      error: 'Full verification required',
      message: 'Please complete ID verification and background check',
    });
    return;
  }

  next();
}

/**
 * Require admin role middleware
 */
export function requireAdmin(
  req: any,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in first',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource',
    });
    return;
  }

  next();
}

// Backward-compatible aliases
export const authenticateToken = authenticateJWT;
export const authMiddleware = authenticateJWT;
