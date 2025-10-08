import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authLimiter, verificationLimiter } from '../middleware/rateLimiter';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenSchema,
  VerifyPhoneSchema,
} from '../validators/authSchemas';

/**
 * Authentication Routes
 *
 * Purpose: Route definitions for authentication endpoints
 * Constitution: Principle I (Child Safety), Principle III (Security)
 *
 * ALL routes are PUBLIC (no authentication required)
 * Rate limiting applied to prevent abuse
 * Input validation with Zod schemas
 *
 * Endpoints:
 * - POST /api/auth/register - Create new user account
 * - POST /api/auth/login - Authenticate existing user
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/verify-phone - Verify phone number with code
 */

const router = Router();

/**
 * Validation middleware factory
 * Validates request body against Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse and validate request body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      // Unexpected validation error
      res.status(500).json({
        success: false,
        error: 'Validation error',
      });
    }
  };
};

import { AuthController } from '../controllers/authController';

/**
 * POST /api/auth/register
 * Register a new user account
 *
 * Body:
 * - email: Valid email address
 * - password: Strong password (8+ chars, uppercase, lowercase, number, special)
 * - phone: E.164 format phone number
 * - firstName: User's first name
 * - lastName: User's last name
 * - dateOfBirth: ISO date format (YYYY-MM-DD)
 * - city: City name
 * - state: 2-letter state code
 * - zipCode: 5-digit US zip code
 * - childrenCount: Number of children (0-10)
 * - childrenAgeGroups: Array of age group categories
 *
 * Response:
 * - success: boolean
 * - data: { userId, accessToken, refreshToken }
 *
 * Rate Limit: 5 requests per 15 minutes
 * Child Safety: REJECTS any child PII fields (childrenNames, childrenPhotos, etc.)
 */
router.post(
  '/register',
  authLimiter,
  validateBody(RegisterRequestSchema),
  AuthController.register
);

/**
 * POST /api/auth/login
 * Authenticate an existing user
 *
 * Body:
 * - email: Valid email address
 * - password: User password
 *
 * Response:
 * - success: boolean
 * - data: { userId, accessToken, refreshToken }
 *
 * Rate Limit: 5 requests per 15 minutes
 */
router.post(
  '/login',
  authLimiter,
  validateBody(LoginRequestSchema),
  AuthController.login
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * Body:
 * - refreshToken: Valid JWT refresh token
 *
 * Response:
 * - success: boolean
 * - data: { accessToken, refreshToken }
 *
 * Rate Limit: General API limiter applies
 */
router.post(
  '/refresh',
  validateBody(RefreshTokenSchema),
  AuthController.refresh
);

/**
 * POST /api/auth/verify-phone
 * Verify phone number with SMS code
 *
 * Body:
 * - phone: E.164 format phone number
 * - code: 6-digit verification code
 *
 * Response:
 * - success: boolean
 * - data: { verified: boolean }
 *
 * Rate Limit: 3 requests per hour
 */
router.post(
  '/verify-phone',
  verificationLimiter,
  validateBody(VerifyPhoneSchema),
  AuthController.verifyPhone
);

export default router;
