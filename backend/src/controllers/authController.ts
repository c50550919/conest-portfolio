/**
 * Authentication Controller
 *
 * Purpose: HTTP request handlers for authentication endpoints
 * Constitution: Principle I (Child Safety), Principle III (Security)
 *
 * T045-T048: AuthController endpoint implementations
 * - register(): POST /api/auth/register
 * - login(): POST /api/auth/login
 * - refresh(): POST /api/auth/refresh
 * - verifyPhone(): POST /api/auth/verify-phone
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export const AuthController = {
  /**
   * T045: POST /api/auth/register
   * Register a new user account
   */
  register: asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        // Child PII violation or duplicate user errors
        if (error.message.includes('Prohibited child PII') ||
            error.message.includes('Child PII')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }

        if (error.message.includes('already exists')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * T046: POST /api/auth/login
   * Authenticate an existing user
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        // Generic "Invalid credentials" for both wrong email and wrong password (security)
        if (error.message.includes('Invalid credentials')) {
          res.status(401).json({
            success: false,
            error: 'Invalid credentials',
          });
          return;
        }

        // Account status errors
        if (error.message.includes('suspended') || error.message.includes('deactivated') ||
            error.message.includes('not active')) {
          res.status(403).json({
            success: false,
            error: 'Account is not active',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * T047: POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  refresh: asyncHandler(async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token required',
        });
        return;
      }

      const tokens = await AuthService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('expired')) {
          res.status(401).json({
            success: false,
            error: 'Invalid or expired refresh token',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * T048: POST /api/auth/verify-phone
   * Verify phone number with SMS code
   */
  verifyPhone: asyncHandler(async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body;

      // Find user by phone number
      const user = await AuthService.findUserByPhone(phone);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Verify the code
      const isValid = await AuthService.verifyPhoneCode(user.id, code);
      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Phone number verified successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          res.status(404).json({
            success: false,
            error: 'User not found',
          });
          return;
        }

        if (error.message.includes('Invalid verification code')) {
          res.status(400).json({
            success: false,
            error: 'Invalid verification code',
          });
          return;
        }

        if (error.message.includes('expired')) {
          res.status(400).json({
            success: false,
            error: 'Invalid or expired verification code',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * Logout user (invalidate refresh token)
   */
  logout: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await AuthService.logout(req.userId);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),
};
