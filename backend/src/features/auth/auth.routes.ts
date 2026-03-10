/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authLimiter, verificationLimiter } from '../../middleware/rateLimit';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenSchema,
  VerifyPhoneSchema,
} from './auth.schemas';
import { AuthController } from './auth.controller';

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
const validateBody =
  (schema: z.ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: |
 *       Create a new parent account. Child safety is enforced - only childrenCount and
 *       generic age groups are accepted. NO child PII fields allowed.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - phone
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *               - city
 *               - state
 *               - zipCode
 *               - childrenCount
 *               - childrenAgeGroups
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: parent@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Must contain uppercase, lowercase, number, and special character
 *               phone:
 *                 type: string
 *                 pattern: '^\+1[0-9]{10}$'
 *                 example: '+15551234567'
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: '1990-05-15'
 *               city:
 *                 type: string
 *                 example: San Francisco
 *               state:
 *                 type: string
 *                 pattern: '^[A-Z]{2}$'
 *                 example: CA
 *               zipCode:
 *                 type: string
 *                 pattern: '^\d{5}$'
 *                 example: '94102'
 *               childrenCount:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 example: 2
 *               childrenAgeGroups:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [infant, toddler, preschool, elementary, middle_school, high_school]
 *                 example: [toddler, elementary]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Validation error or child PII rejected
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Rate limit exceeded (5 requests per 15 minutes)
 */
router.post('/register', authLimiter, validateBody(RegisterRequestSchema), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate an existing user
 *     description: Login with email and password to receive access and refresh tokens
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: parent@example.com
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limit exceeded (5 requests per 15 minutes)
 */
router.post('/login', authLimiter, validateBody(LoginRequestSchema), AuthController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token for new access and refresh tokens
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid JWT refresh token
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', validateBody(RefreshTokenSchema), AuthController.refresh);

/**
 * @swagger
 * /api/auth/verify-phone:
 *   post:
 *     summary: Verify phone number
 *     description: Verify phone number using SMS verification code
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^\+1[0-9]{10}$'
 *                 example: '+15551234567'
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Phone verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     verified:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid verification code
 *       429:
 *         description: Rate limit exceeded (3 requests per hour)
 */
router.post(
  '/verify-phone',
  verificationLimiter,
  validateBody(VerifyPhoneSchema),
  AuthController.verifyPhone,
);

export default router;
