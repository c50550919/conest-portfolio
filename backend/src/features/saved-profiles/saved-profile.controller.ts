import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import SavedProfileService from './saved-profile.service';

/**
 * SavedProfile Controller
 *
 * Feature: 003-complete-3-critical (Saved/Bookmarked Profiles)
 * Constitution Principle I: NO child PII - only parent data
 * Constitution Principle III: Private notes encrypted at rest
 *
 * Endpoints:
 * - POST /api/saved-profiles - Save a profile
 * - GET /api/saved-profiles - Get all saved profiles (with optional folder filter)
 * - GET /api/saved-profiles/folders - Get profiles grouped by folder
 * - PATCH /api/saved-profiles/:id - Update folder or notes
 * - DELETE /api/saved-profiles/:id - Remove saved profile
 * - GET /api/saved-profiles/compare - Compare 2-4 profiles
 * - GET /api/saved-profiles/limit-status - Get save limit status
 */

export class SavedProfileController {
  /**
   * Save a profile to a folder with optional notes
   * POST /api/saved-profiles
   */
  async saveProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { profile_id, folder, notes } = req.body;

      const savedProfile = await SavedProfileService.saveProfile(
        userId,
        profile_id,
        folder,
        notes,
      );

      res.status(201).json({
        success: true,
        data: savedProfile,
      });
    } catch (error: any) {
      if (error.message === 'SAVED_PROFILES_LIMIT_REACHED') {
        res.status(400).json({ error: 'You have reached the maximum of 50 saved profiles' });
        return;
      }
      if (error.message === 'PROFILE_ALREADY_SAVED') {
        res.status(409).json({ error: 'Profile is already saved' });
        return;
      }
      if (error.message === 'CANNOT_SAVE_OWN_PROFILE') {
        res.status(400).json({ error: 'Cannot save your own profile' });
        return;
      }
      if (error.message === 'NOTES_TOO_LONG') {
        res.status(400).json({ error: 'Notes must be 500 characters or less' });
        return;
      }
      next(error);
    }
  }

  /**
   * Get all saved profiles for the current user
   * GET /api/saved-profiles?folder=<folder-name>
   */
  async getSavedProfiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { folder } = req.query;

      const savedProfiles = await SavedProfileService.getSavedProfiles(
        userId,
        folder as string,
      );

      res.status(200).json({
        success: true,
        data: savedProfiles,
        count: savedProfiles.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get saved profiles grouped by folder
   * GET /api/saved-profiles/folders
   */
  async getSavedProfilesByFolder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profilesByFolder = await SavedProfileService.getSavedProfilesByFolder(userId);

      res.status(200).json({
        success: true,
        data: profilesByFolder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get decrypted notes for a saved profile
   * GET /api/saved-profiles/:id/notes
   */
  async getNotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const notes = await SavedProfileService.getNotes(id, userId);

      res.status(200).json({
        success: true,
        data: { notes },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update folder or notes for a saved profile
   * PATCH /api/saved-profiles/:id
   */
  async updateSavedProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { folder, notes } = req.body;

      let savedProfile;

      if (folder) {
        savedProfile = await SavedProfileService.moveToFolder(id, userId, folder);
      } else if (notes !== undefined) {
        savedProfile = await SavedProfileService.updateNotes(id, userId, notes);
      } else {
        res.status(400).json({ error: 'Must provide folder or notes to update' });
        return;
      }

      res.status(200).json({
        success: true,
        data: savedProfile,
      });
    } catch (error: any) {
      if (error.message === 'SAVED_PROFILE_NOT_FOUND') {
        res.status(404).json({ error: 'Saved profile not found' });
        return;
      }
      if (error.message === 'NOTES_TOO_LONG') {
        res.status(400).json({ error: 'Notes must be 500 characters or less' });
        return;
      }
      next(error);
    }
  }

  /**
   * Delete a saved profile
   * DELETE /api/saved-profiles/:id
   */
  async deleteSavedProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      await SavedProfileService.unsaveProfile(id, userId);

      res.status(200).json({
        success: true,
        message: 'Profile unsaved successfully',
      });
    } catch (error: any) {
      if (error.message === 'SAVED_PROFILE_NOT_FOUND') {
        res.status(404).json({ error: 'Saved profile not found' });
        return;
      }
      next(error);
    }
  }

  /**
   * Compare 2-4 saved profiles side-by-side
   * GET /api/saved-profiles/compare?ids=id1,id2,id3
   */
  async compareProfiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { ids } = req.query;
      const idArray = (ids as string).split(',');

      const profiles = await SavedProfileService.compareProfiles(userId, idArray);

      res.status(200).json({
        success: true,
        data: profiles,
        count: profiles.length,
      });
    } catch (error: any) {
      if (error.message === 'INVALID_COMPARISON_COUNT') {
        res.status(400).json({ error: 'Must provide 2-4 profile IDs for comparison' });
        return;
      }
      if (error.message === 'SOME_PROFILES_NOT_FOUND') {
        res.status(404).json({ error: 'One or more profiles not found' });
        return;
      }
      next(error);
    }
  }

  /**
   * Get saved profile limit status (count and remaining)
   * GET /api/saved-profiles/limit-status
   */
  async getLimitStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limitStatus = await SavedProfileService.getLimitStatus(userId);

      res.status(200).json({
        success: true,
        data: limitStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if a profile is saved
   * GET /api/saved-profiles/check/:profileId
   */
  async checkIfSaved(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { profileId } = req.params;

      const isSaved = await SavedProfileService.isSaved(userId, profileId);

      res.status(200).json({
        success: true,
        data: { isSaved },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SavedProfileController();
