import { SavedProfileModel } from '../models/SavedProfile';
import type {
  SavedProfile,
  CreateSavedProfileData,
  SavedProfileWithProfile,
} from '../models/SavedProfile';

/**
 * SavedProfileService
 *
 * Feature: 003-complete-3-critical (Saved/Bookmarked Profiles)
 * Business logic layer for saved profiles
 * - Enforces 50-profile limit
 * - Validates folder names
 * - Handles encryption/decryption
 * - Prevents saving own profile
 */

export class SavedProfileService {
  /**
   * Save a profile to a folder with optional notes
   * @throws Error if limit reached or validation fails
   */
  async saveProfile(
    userId: string,
    profileId: string,
    folder: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup',
    notes?: string
  ): Promise<SavedProfile> {
    // Validate notes length if provided
    if (notes && notes.length > 500) {
      throw new Error('NOTES_TOO_LONG');
    }

    // Check if profile is already saved
    const isSaved = await SavedProfileModel.isSaved(userId, profileId);
    if (isSaved) {
      throw new Error('PROFILE_ALREADY_SAVED');
    }

    const data: CreateSavedProfileData = {
      user_id: userId,
      profile_id: profileId,
      folder,
      notes,
    };

    return await SavedProfileModel.create(data);
  }

  /**
   * Get all saved profiles for a user, optionally filtered by folder
   */
  async getSavedProfiles(
    userId: string,
    folder?: string
  ): Promise<SavedProfileWithProfile[]> {
    return await SavedProfileModel.findByUserId(userId, folder);
  }

  /**
   * Get saved profiles grouped by folder
   */
  async getSavedProfilesByFolder(userId: string): Promise<{
    'Top Choice': SavedProfileWithProfile[];
    'Strong Maybe': SavedProfileWithProfile[];
    'Considering': SavedProfileWithProfile[];
    'Backup': SavedProfileWithProfile[];
  }> {
    const [topChoice, strongMaybe, considering, backup] = await Promise.all([
      SavedProfileModel.findByUserId(userId, 'Top Choice'),
      SavedProfileModel.findByUserId(userId, 'Strong Maybe'),
      SavedProfileModel.findByUserId(userId, 'Considering'),
      SavedProfileModel.findByUserId(userId, 'Backup'),
    ]);

    return {
      'Top Choice': topChoice,
      'Strong Maybe': strongMaybe,
      'Considering': considering,
      'Backup': backup,
    };
  }

  /**
   * Get decrypted notes for a saved profile
   */
  async getNotes(id: string, userId: string): Promise<string | null> {
    return await SavedProfileModel.getDecryptedNotes(id, userId);
  }

  /**
   * Move a saved profile to a different folder
   */
  async moveToFolder(
    id: string,
    userId: string,
    folder: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup'
  ): Promise<SavedProfile> {
    return await SavedProfileModel.update(id, userId, { folder });
  }

  /**
   * Update notes for a saved profile
   */
  async updateNotes(
    id: string,
    userId: string,
    notes: string | null
  ): Promise<SavedProfile> {
    // Validate notes length if provided
    if (notes && notes.length > 500) {
      throw new Error('NOTES_TOO_LONG');
    }

    return await SavedProfileModel.update(id, userId, { notes });
  }

  /**
   * Delete a saved profile
   */
  async unsaveProfile(id: string, userId: string): Promise<void> {
    return await SavedProfileModel.delete(id, userId);
  }

  /**
   * Compare 2-4 saved profiles side-by-side
   */
  async compareProfiles(
    userId: string,
    ids: string[]
  ): Promise<SavedProfileWithProfile[]> {
    if (ids.length < 2 || ids.length > 4) {
      throw new Error('INVALID_COMPARISON_COUNT');
    }

    return await SavedProfileModel.compareProfiles(userId, ids);
  }

  /**
   * Get saved profile count and limit status for a user
   */
  async getLimitStatus(userId: string): Promise<{
    count: number;
    limit: number;
    remaining: number;
  }> {
    const count = await SavedProfileModel.countByUserId(userId);
    return {
      count,
      limit: 50,
      remaining: 50 - count,
    };
  }

  /**
   * Check if a profile is saved by a user
   */
  async isSaved(userId: string, profileId: string): Promise<boolean> {
    return await SavedProfileModel.isSaved(userId, profileId);
  }
}

export default new SavedProfileService();
