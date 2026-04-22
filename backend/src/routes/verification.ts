import { Router } from 'express';
import { verificationController } from '../controllers/verificationController';
import { authenticateToken } from '../middleware/auth';
import { verificationRateLimit } from '../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/status', verificationController.getStatus);
router.post('/phone/send', verificationRateLimit, verificationController.sendPhoneVerification);
router.post('/phone/verify', verificationController.verifyPhone);
router.post('/email/send', verificationRateLimit, verificationController.sendEmailVerification);
router.get('/email/verify/:userId', verificationController.verifyEmail);
router.post('/id/initiate', verificationRateLimit, verificationController.initiateIDVerification);
router.post('/id/complete', verificationController.completeIDVerification);
router.post('/background/initiate', verificationRateLimit, verificationController.initiateBackgroundCheck);
router.post('/income/initiate', verificationRateLimit, verificationController.initiateIncomeVerification);

export default router;
