import { Router } from 'express';
import { profileController } from './profile.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation';
import {
  uploadProfilePhoto,
  handleUploadError,
  requireFile,
  logUploadMetadata,
} from '../../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Profile CRUD
router.post('/', validate(schemas.createProfile), profileController.createProfile);
router.get('/me', profileController.getMyProfile);
router.get('/search', profileController.searchProfiles);
router.get('/:id', profileController.getProfile);
router.put('/me', validate(schemas.updateProfile), profileController.updateProfile);
router.delete('/me', profileController.deleteProfile);

// Profile photo upload
// POST /api/profiles/photo - Upload profile photo
// Field name must be "photo" in the multipart form data
router.post(
  '/photo',
  uploadProfilePhoto.single('photo'),
  handleUploadError,
  requireFile('photo'),
  logUploadMetadata,
  profileController.uploadPhoto,
);

// DELETE /api/profiles/photo - Delete profile photo
router.delete('/photo', profileController.deletePhoto);

export default router;
