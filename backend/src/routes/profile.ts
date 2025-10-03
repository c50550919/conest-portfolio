import { Router } from 'express';
import { profileController } from '../controllers/profileController';
import { authenticateToken, requireVerification } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', validate(schemas.createProfile), profileController.createProfile);
router.get('/me', profileController.getMyProfile);
router.get('/search', profileController.searchProfiles);
router.get('/:id', profileController.getProfile);
router.put('/me', validate(schemas.updateProfile), profileController.updateProfile);
router.delete('/me', profileController.deleteProfile);

export default router;
