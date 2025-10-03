import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// Webhook route (no authentication)
router.post('/webhook', paymentController.handleWebhook);

// All other routes require authentication
router.use(authenticateToken);

router.post('/create', paymentLimiter, paymentController.createPayment);
router.get('/my-payments', paymentController.getMyPayments);
router.get('/household/:householdId', paymentController.getHouseholdPayments);
router.get('/overdue', paymentController.getOverduePayments);
router.post('/:paymentId/refund', paymentController.refundPayment);
router.post('/household/:householdId/split-rent', paymentController.splitRent);
router.post('/stripe/create-account', paymentController.createStripeAccount);
router.get('/stripe/onboarding/:householdId', paymentController.getOnboardingLink);

export default router;
