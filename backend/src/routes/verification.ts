import { Router } from 'express';
import { verificationController } from '../controllers/verificationController';
import { authenticateToken } from '../middleware/auth.middleware';
import { verificationLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/status', verificationController.getStatus);
router.post('/phone/send', verificationLimiter, verificationController.sendPhoneVerification);
router.post('/phone/verify', verificationController.verifyPhone);
router.post('/email/send', verificationLimiter, verificationController.sendEmailVerification);
router.get('/email/verify/:userId', verificationController.verifyEmail);
router.post('/id/initiate', verificationLimiter, verificationController.initiateIDVerification);
router.post('/id/complete', verificationController.completeIDVerification);
router.post('/background/initiate', verificationLimiter, verificationController.initiateBackgroundCheck);
router.post('/income/initiate', verificationLimiter, verificationController.initiateIncomeVerification);

export default router;
