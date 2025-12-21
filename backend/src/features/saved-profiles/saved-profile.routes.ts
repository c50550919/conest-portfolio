import { Router } from 'express';
import savedProfileController from './saved-profile.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation';
import {
  createSavedProfileSchema,
  updateSavedProfileSchema,
  deleteSavedProfileSchema,
  getSavedProfilesSchema,
  compareProfilesSchema,
} from '../../validators/savedProfileValidator';

/**
 * SavedProfile Routes
 *
 * Feature: 003-complete-3-critical (Saved/Bookmarked Profiles)
 * All routes require authentication
 */

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * @route   POST /api/saved-profiles
 * @desc    Save a profile to a folder with optional notes
 * @access  Private
 */
router.post(
  '/',
  validate(createSavedProfileSchema),
  savedProfileController.saveProfile,
);

/**
 * @route   GET /api/saved-profiles
 * @desc    Get all saved profiles (with optional folder filter)
 * @access  Private
 * @query   folder - Optional folder name to filter by
 */
router.get(
  '/',
  validate(getSavedProfilesSchema),
  savedProfileController.getSavedProfiles,
);

/**
 * @route   GET /api/saved-profiles/folders
 * @desc    Get saved profiles grouped by folder
 * @access  Private
 */
router.get(
  '/folders',
  savedProfileController.getSavedProfilesByFolder,
);

/**
 * @route   GET /api/saved-profiles/limit-status
 * @desc    Get saved profile limit status (count and remaining)
 * @access  Private
 */
router.get(
  '/limit-status',
  savedProfileController.getLimitStatus,
);

/**
 * @route   GET /api/saved-profiles/compare
 * @desc    Compare 2-4 saved profiles side-by-side
 * @access  Private
 * @query   ids - Comma-separated list of 2-4 profile IDs
 */
router.get(
  '/compare',
  validate(compareProfilesSchema),
  savedProfileController.compareProfiles,
);

/**
 * @route   GET /api/saved-profiles/check/:profileId
 * @desc    Check if a profile is saved
 * @access  Private
 */
router.get(
  '/check/:profileId',
  savedProfileController.checkIfSaved,
);

/**
 * @route   GET /api/saved-profiles/:id/notes
 * @desc    Get decrypted notes for a saved profile
 * @access  Private
 */
router.get(
  '/:id/notes',
  savedProfileController.getNotes,
);

/**
 * @route   PATCH /api/saved-profiles/:id
 * @desc    Update folder or notes for a saved profile
 * @access  Private
 */
router.patch(
  '/:id',
  validate(updateSavedProfileSchema),
  savedProfileController.updateSavedProfile,
);

/**
 * @route   DELETE /api/saved-profiles/:id
 * @desc    Delete a saved profile
 * @access  Private
 */
router.delete(
  '/:id',
  validate(deleteSavedProfileSchema),
  savedProfileController.deleteSavedProfile,
);

export default router;
