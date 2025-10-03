import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, phone } = req.body;

    const result = await AuthService.register({ email, password, phone });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password });

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const tokens = await AuthService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  }),

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

  requestPasswordReset: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await AuthService.requestPasswordReset(email);

    res.json({
      success: true,
      message: 'Password reset instructions sent to email',
    });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password required' });
      return;
    }

    await AuthService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  }),

  enable2FA: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await AuthService.enable2FA(req.userId);

    res.json({
      success: true,
      data: result,
    });
  }),

  verify2FA: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;

    const isValid = await AuthService.verify2FA(req.userId, code);

    res.json({
      success: true,
      valid: isValid,
    });
  }),

  disable2FA: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await AuthService.disable2FA(req.userId);

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  }),
};
