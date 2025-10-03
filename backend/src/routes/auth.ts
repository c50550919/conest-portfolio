import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login', authLimiter, validate(schemas.login), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/request-password-reset', authLimiter, authController.requestPasswordReset);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.post('/2fa/enable', authenticateToken, authController.enable2FA);
router.post('/2fa/verify', authenticateToken, authController.verify2FA);
router.post('/2fa/disable', authenticateToken, authController.disable2FA);

export default router;
