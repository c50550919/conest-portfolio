/**
 * JWT Authentication Middleware - T041
 *
 * Constitution Principle III: Security
 * - Validates JWT access tokens
 * - Attaches userId to request object
 * - Returns 401 for invalid/missing tokens
 * - Uses JWT utility from T038
 *
 * Usage:
 *   app.use(authenticateJWT)
 *   router.get('/protected', authenticateJWT, handler)
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, verifyAccessToken, JWTPayload } from '../utils/jwt';
import { UserModel } from '../models/User';

/**
 * Extended Request interface with user authentication data
 */
export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  email?: string;
  jwtPayload?: JWTPayload;
}

/**
 * JWT Authentication Middleware
 * Verifies Bearer token and attaches user data to request
 */
export async function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Access token is missing',
      });
      return;
    }

    // Verify token using JWT utility (T038)
    const verificationResult = verifyToken(token);

    if (!verificationResult.valid || !verificationResult.payload) {
      // Handle different error types
      const statusCode = verificationResult.errorType === 'expired' ? 401 : 403;
      res.status(statusCode).json({
        error: 'Invalid token',
        message: verificationResult.error || 'Token verification failed',
        type: verificationResult.errorType,
      });
      return;
    }

    const payload = verificationResult.payload;

    // Verify user exists and is active
    const user = await UserModel.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'User not found',
      });
      return;
    }

    if (user.account_status !== 'active') {
      res.status(403).json({
        error: 'Account inactive',
        message: `Account is ${user.account_status}`,
      });
      return;
    }

    // Attach user data to request
    req.userId = payload.userId;
    req.user = user;
    req.email = payload.email;
    req.jwtPayload = payload;

    next();
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication',
    });
  }
}

/**
 * Legacy authentication function for backward compatibility
 * @deprecated Use authenticateJWT instead
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.email = payload.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Attaches user data if token is valid, but doesn't fail if missing
 */
export async function authenticateJWTOptional(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const verificationResult = verifyToken(token);

    if (verificationResult.valid && verificationResult.payload) {
      const payload = verificationResult.payload;
      const user = await UserModel.findById(payload.userId);

      if (user && user.account_status === 'active') {
        req.userId = payload.userId;
        req.user = user;
        req.email = payload.email;
        req.jwtPayload = payload;
      }
    }

    next();
  } catch (error) {
    console.error('Optional JWT authentication error:', error);
    next();
  }
}

/**
 * Require email verification middleware
 */
export function requireEmailVerification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
