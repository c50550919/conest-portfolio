import { Router } from 'express';
import { verificationController } from './verification.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
  verificationLimiter,
  phoneVerificationRateLimit,
  phoneNumberRateLimit,
  otpAttemptRateLimit,
} from '../../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/status', verificationController.getStatus);

// Phone verification with multi-layer rate limiting:
// 1. phoneVerificationRateLimit: 10 requests per IP per hour
// 2. phoneNumberRateLimit: 3 requests per phone number per hour
// This protects against both IP-based abuse and SMS bombing
router.post(
  '/phone/send',
  phoneVerificationRateLimit,
  phoneNumberRateLimit,
  verificationController.sendPhoneVerification
);

// OTP verification with attempt limiting:
// 5 wrong attempts per phone per 15 minutes (prevents brute force)
router.post(
  '/phone/verify',
  otpAttemptRateLimit,
  verificationController.verifyPhone
);

router.post('/email/send', verificationLimiter, verificationController.sendEmailVerification);
router.get('/email/verify/:userId', verificationController.verifyEmail);
router.post('/id/initiate', verificationLimiter, verificationController.initiateIDVerification);
router.post('/id/complete', verificationController.completeIDVerification);
router.post('/background/initiate', verificationLimiter, verificationController.initiateBackgroundCheck);
router.post('/income/initiate', verificationLimiter, verificationController.initiateIncomeVerification);

export default router;
