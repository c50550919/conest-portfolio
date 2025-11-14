import { Router } from 'express';
import { matchController } from '../controllers/matchController';
import { authenticateToken, requireFullVerification } from '../middleware/auth';

const router = Router();

// All routes require authentication and full verification
router.use(authenticateToken);
router.use(requireFullVerification);

router.get('/find', matchController.findMatches);
router.get('/my-matches', matchController.getMyMatches);
router.get('/compatibility/:targetUserId', matchController.calculateCompatibility);
router.get('/:id', matchController.getMatch);
router.post('/create', matchController.createMatch);
router.post('/:id/respond', matchController.respondToMatch);

export default router;
