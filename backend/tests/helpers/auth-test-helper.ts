/**
 * Auth Test Helper
 *
 * Purpose: Provide authentication utilities for contract and integration tests
 * Allows tests to authenticate without requiring real database users
 *
 * Usage:
 *   // Option 1: Mock the auth middleware at module level
 *   jest.mock('../../src/middleware/auth.middleware', () => ({
 *     ...jest.requireActual('../../src/middleware/auth.middleware'),
 *     authenticateJWT: mockAuthMiddleware(),
 *   }));
 *
 *   // Option 2: Use setupTestAuth() for cleaner setup
 *   import { setupTestAuth } from '../helpers/auth-test-helper';
 *   setupTestAuth();
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../src/middleware/auth.middleware';

// Test JWT secret - must match the one in tests/setup-env.ts
const TEST_JWT_SECRET = 'test-secret-key-for-testing-only';

/**
 * Mock user data for testing
 */
export interface MockUser {
  id: string;
  email: string;
  account_status?: 'active' | 'suspended' | 'deactivated';
  email_verified?: boolean;
  phone_verified?: boolean;
  id_verified?: boolean;
  background_check_complete?: boolean;
  role?: 'user' | 'admin';
}

/**
 * Default mock user for tests
 */
export const defaultMockUser: MockUser = {
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
 * Generate a valid test JWT token
 *
 * @param userId - User ID for the token payload
 * @param email - Email for the token payload
 * @param expiresIn - Token expiration (default: 1h)
 */
export function createTestToken(
  userId: string = defaultMockUser.id,
  email: string = defaultMockUser.email,
  expiresIn: string = '1h'
): string {
  return jwt.sign({ userId, email }, TEST_JWT_SECRET, { expiresIn });
}

/**
 * Create Authorization header value with Bearer token
 */
export function createAuthHeader(
  userId: string = defaultMockUser.id,
  email: string = defaultMockUser.email
): string {
  return `Bearer ${createTestToken(userId, email)}`;
}

/**
 * Create a mock auth middleware that bypasses real JWT validation
 * Extracts user info from the token if valid, or uses mock user
 *
 * @param mockUser - Optional custom mock user data
 */
export function createMockAuthMiddleware(mockUser: MockUser = defaultMockUser) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (error) {
      // If token is invalid, check if it's a mock token pattern
      if (token.startsWith('mock-token-')) {
        const userId = token.replace('mock-token-', '');
        req.userId = userId;
        req.email = mockUser.email;
        req.user = { ...mockUser, id: userId };
        req.jwtPayload = { userId, email: mockUser.email };
      } else if (token === 'mock-jwt-token' || token === 'mock-jwt-token-new-user') {
        req.userId = mockUser.id;
        req.email = mockUser.email;
        req.user = mockUser;
        req.jwtPayload = { userId: mockUser.id, email: mockUser.email };
      } else {
        res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid authentication token',
        });
        return;
      }
    }

    next();
  };
}

/**
 * Create a mock auth middleware factory for Jest
 * Returns the middleware function wrapped in a jest function
 */
export function mockAuthMiddleware(mockUser: MockUser = defaultMockUser) {
  return jest.fn(createMockAuthMiddleware(mockUser));
}

/**
 * Setup global auth mocking for all tests in a file
 * Call this in beforeAll() or at the top of your test file
 *
 * Example:
 *   beforeAll(() => {
 *     setupTestAuth();
 *   });
 */
export function setupTestAuth(mockUser: MockUser = defaultMockUser): void {
  jest.mock('../../src/middleware/auth.middleware', () => {
    const actual = jest.requireActual('../../src/middleware/auth.middleware');
    return {
      ...actual,
      authenticateJWT: createMockAuthMiddleware(mockUser),
      authMiddleware: createMockAuthMiddleware(mockUser),
      authenticateToken: createMockAuthMiddleware(mockUser),
    };
  });
}

/**
 * Jest mock configuration for auth middleware
 * Import this at the top of your test file to mock auth:
 *
 * jest.mock('../../src/middleware/auth.middleware', () =>
 *   require('../helpers/auth-test-helper').authMiddlewareMock
 * );
 */
export const authMiddlewareMock = {
  authenticateJWT: createMockAuthMiddleware(defaultMockUser),
  authMiddleware: createMockAuthMiddleware(defaultMockUser),
  authenticateToken: createMockAuthMiddleware(defaultMockUser),
  authenticate: createMockAuthMiddleware(defaultMockUser),
  authenticateJWTOptional: async (req: AuthRequest, _res: Response, next: NextFunction) => {
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
        // Optional auth - don't fail on invalid token
      }
    }
    next();
  },
  requireEmailVerification: (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.email_verified) {
      return res.status(403).json({ error: 'Email verification required' });
    }
    next();
  },
  requirePhoneVerification: (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.phone_verified) {
      return res.status(403).json({ error: 'Phone verification required' });
    }
    next();
  },
  requireFullVerification: (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id_verified || !req.user?.background_check_complete) {
      return res.status(403).json({ error: 'Full verification required' });
    }
    next();
  },
  requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
  AuthRequest: {},
};

/**
 * Create test users with auth tokens for integration tests
 * Returns both the user data and a valid auth token
 */
export function createTestUserWithAuth(overrides: Partial<MockUser> = {}): {
  user: MockUser;
  token: string;
  authHeader: string;
} {
  const user: MockUser = { ...defaultMockUser, ...overrides };
  const token = createTestToken(user.id, user.email);
  const authHeader = `Bearer ${token}`;

  return { user, token, authHeader };
}
