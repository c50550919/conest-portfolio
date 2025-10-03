import { Response } from 'express';
import { VerificationService } from '../services/verificationService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const verificationController = {
  getStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = await VerificationService.getVerificationStatus(req.userId);

    res.json({
      success: true,
      data: status,
    });
  }),

  sendPhoneVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await VerificationService.sendPhoneVerification(req.userId);

    res.json({
      success: true,
      message: 'Verification code sent to your phone',
    });
  }),

  verifyPhone: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Verification code required' });
      return;
    }

    const isValid = await VerificationService.verifyPhoneCode(req.userId, code);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    res.json({
      success: true,
      message: 'Phone verified successfully',
    });
  }),

  sendEmailVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await VerificationService.sendEmailVerification(req.userId);

    res.json({
      success: true,
      message: 'Verification email sent',
    });
  }),

  verifyEmail: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await VerificationService.verifyEmail(userId);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  }),

  initiateIDVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await VerificationService.initiateIDVerification(req.userId);

    res.json({
      success: true,
      data: result,
    });
  }),

  completeIDVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await VerificationService.completeIDVerification(req.userId);

    res.json({
      success: true,
      message: 'ID verification completed',
    });
  }),

  initiateBackgroundCheck: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await VerificationService.initiateBackgroundCheck(req.userId);

    res.json({
      success: true,
      message: 'Background check initiated',
    });
  }),

  initiateIncomeVerification: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { documents } = req.body;

    await VerificationService.initiateIncomeVerification(req.userId, documents || []);

    res.json({
      success: true,
      message: 'Income verification initiated',
    });
  }),
};
