/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Response } from 'express';
import { ProfileModel } from '../../models/Profile';
import { ParentModel } from '../../models/Parent';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sanitizeHTML } from '../../middleware/sanitization';
import s3Service from '../../services/s3Service';
import logger from '../../config/logger';
import db from '../../config/database';
import { deleteUserSessions } from '../../services/sessionService';
import { UserModel } from '../../models/User';
import { getEmailService } from '../../services/emailService';

/**
 * Calculate profile completion percentage based on filled fields.
 * Weights: base(10) + location(15) + budget(15) + dob(10) + bio(10)
 *   + occupation(10) + schedule(10) + parenting(5) + children(5)
 *   + housing(5) + moveIn(5) = 100
 */
function calculateProfileCompletion(parent: Record<string, unknown>): number {
  let pct = 10; // base: account exists
  if (parent.city && parent.state && parent.zip_code) pct += 15;
  if (
    (parent.budget_min !== null &&
      parent.budget_max !== null &&
      (parent.budget_min as number) > 0) ||
    (parent.budget_max as number) > 0
  )
    pct += 15;
  if (parent.date_of_birth) pct += 10;
  if (parent.bio) pct += 10;
  if (parent.occupation) pct += 10;
  if (parent.work_schedule || parent.work_from_home !== null) pct += 10;
  if (parent.parenting_style) pct += 5;
  if ((parent.children_count as number) > 0) pct += 5;
  if (parent.housing_status) pct += 5;
  if (parent.move_in_date) pct += 5;
  return Math.min(pct, 100);
}

export const profileController = {
  createProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if profile already exists
    const existing = await ProfileModel.findByUserId(req.userId);
    if (existing) {
      res.status(400).json({ error: 'Profile already exists' });
      return;
    }

    const profileData = {
      ...req.body,
      user_id: req.userId,
      date_of_birth: new Date(req.body.date_of_birth),
    };

    const profile = await ProfileModel.create(profileData);

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: profile,
    });
  }),

  getMyProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await ProfileModel.findByUserId(req.userId);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({
      success: true,
      data: profile,
    });
  }),

  getProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const profile = await ProfileModel.findById(id);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Only return public profile info
    const publicProfile = {
      id: profile.id,
      first_name: profile.first_name,
      city: profile.city,
      state: profile.state,
      bio: profile.bio,
      profile_image_url: profile.profile_image_url,
      children_count: profile.children_count,
      children_age_groups: profile.children_age_groups,
      parenting_style: profile.parenting_style,
      verified: profile.verified,
      verification_level: profile.verification_level,
    };

    res.json({
      success: true,
      data: publicProfile,
    });
  }),

  updateProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await ProfileModel.findByUserId(req.userId);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const updatedProfile = await ProfileModel.update(profile.id, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  }),

  searchProfiles: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { city, state, budgetMin, budgetMax, verified } = req.query;

    const filters = {
      city: city as string,
      state: state as string,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      verified: verified === 'true',
    };

    const profiles = await ProfileModel.search(filters);

    res.json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  }),

  /**
   * CMP-08: GDPR-compliant account deletion
   *
   * Cascade deletes all user data within a transaction.
   * Payment/audit records are anonymized (not deleted) for financial compliance.
   * Messages are anonymized for child safety audit trail.
   */
  deleteProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.userId;

    logger.info('Account deletion initiated', { userId });

    // Capture user email BEFORE cascade delete (needed for confirmation email)
    const user = await UserModel.findById(userId);
    const userEmail = user?.email;

    try {
      await db.transaction(async (trx) => {
        // Delete tables without CASCADE FKs first (manual cleanup).
        // Tables with onDelete('CASCADE') on user FK will be auto-deleted
        // when the user row is removed in the final step.

        // 1. DELETE data from tables that may lack CASCADE FKs
        await trx('pre_qualification_responses').where('user_id', userId).delete();
        await trx('saved_profiles').where('user_id', userId).delete();
        await trx('swipes').where('user_id', userId).orWhere('target_user_id', userId).delete();
        await trx('connection_requests')
          .where('sender_id', userId)
          .orWhere('recipient_id', userId)
          .delete();
        await trx('matches').where('user_id_1', userId).orWhere('user_id_2', userId).delete();
        await trx('household_members').where('user_id', userId).delete();
        await trx('match_group_members').where('user_id', userId).delete();
        await trx('verification_webhook_events').where('user_id', userId).delete();
        await trx('verifications').where('user_id', userId).delete();
        await trx('verification_payments').where('user_id', userId).delete();
        await trx('billing_transactions').where('user_id', userId).delete();
        await trx('subscriptions').where('user_id', userId).delete();

        // 2. DELETE profile and parent records
        await trx('parents').where('user_id', userId).delete();
        await trx('profiles').where('user_id', userId).delete();

        // 3. DELETE user record last — triggers CASCADE for any remaining
        // FK references (messages, conversations, etc.)
        await trx('users').where('id', userId).delete();
      });

      // 7. Clear Redis sessions (outside transaction — non-critical)
      try {
        await deleteUserSessions(userId);
      } catch (sessionError) {
        logger.warn('Failed to clear Redis sessions during account deletion', {
          userId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown',
        });
      }

      logger.info('Account deleted successfully', { userId });

      // Fire-and-forget deletion confirmation email (never throws)
      if (userEmail) {
        getEmailService().sendAccountDeletionConfirmation(userEmail);
      }

      res.json({
        success: true,
        message: 'Account and all associated data have been permanently deleted.',
      });
    } catch (error) {
      logger.error('Account deletion failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(500).json({
        error: 'Account deletion failed. Please contact support.',
      });
    }
  }),

  /**
   * Upload profile photo
   * Uploads to S3 and updates profile with new photo URL
   *
   * Security:
   * - File validated by multer middleware before reaching here
   * - S3 service performs additional validation
   * - Old photo deleted from S3 to prevent storage exhaustion
   */
  uploadPhoto: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Multer puts the file in req.file
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Find user's profile
    const profile = await ProfileModel.findByUserId(req.userId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Create a profile first.' });
      return;
    }

    try {
      // Upload new photo to S3
      const uploadResult = await s3Service.uploadFile({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        userId: req.userId,
        category: 'profile-photos',
      });

      // If user had a previous photo, delete it from S3
      if (profile.profile_image_url) {
        try {
          // Extract key from old URL (stored as S3 key or full URL)
          const oldKey = profile.profile_image_url.includes('/')
            ? profile.profile_image_url.split('/').slice(-3).join('/')
            : profile.profile_image_url;

          if (oldKey.startsWith('profile-photos/')) {
            await s3Service.deleteFile(oldKey);
            logger.info('Deleted old profile photo', { key: oldKey, userId: req.userId });
          }
        } catch (deleteError) {
          // Log but don't fail - orphaned files can be cleaned up later
          logger.warn('Failed to delete old profile photo', {
            error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
            userId: req.userId,
          });
        }
      }

      // Update profile with new photo URL
      const updatedProfile = await ProfileModel.update(profile.id, {
        profile_image_url: uploadResult.url,
      });

      logger.info('Profile photo uploaded successfully', {
        userId: req.userId,
        profileId: profile.id,
        key: uploadResult.key,
        size: uploadResult.size,
      });

      res.json({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: {
          profile_image_url: uploadResult.url,
          profile: updatedProfile,
        },
      });
    } catch (error) {
      logger.error('Profile photo upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to upload photo. Please try again.',
      });
    }
  }),

  // =========================================================================
  // Slim Onboarding Endpoints (parents table)
  // =========================================================================

  /**
   * PUT /api/profile/location
   * Slim onboarding step 2: Set location from map picker
   */
  updateLocation: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parent = await ParentModel.findByUserId(req.userId);
    if (!parent) {
      res.status(404).json({ error: 'Parent profile not found' });
      return;
    }

    const { city, state, zipCode } = req.body;

    await ParentModel.update(parent.id, {
      city,
      state,
      zip_code: zipCode,
    });

    res.json({
      success: true,
      profile: { city, state, zipCode },
    });
  }),

  /**
   * PUT /api/profile/budget
   * Slim onboarding step 3: Set budget range
   * Side effect: marks profile as complete (minimum viable) at 40%
   */
  updateBudget: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parent = await ParentModel.findByUserId(req.userId);
    if (!parent) {
      res.status(404).json({ error: 'Parent profile not found' });
      return;
    }

    const { budgetMin, budgetMax } = req.body;

    await ParentModel.update(parent.id, {
      budget_min: budgetMin,
      budget_max: budgetMax,
      profile_completed: true,
      profile_completion_percentage: 40,
    });

    res.json({
      success: true,
      profile: {
        budgetMin,
        budgetMax,
        profileComplete: true,
      },
    });
  }),

  /**
   * PUT /api/profile/housing-status
   * Set or clear housing status and room details.
   * When clearing (null), all room_* fields are also cleared.
   */
  updateHousingStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parent = await ParentModel.findByUserId(req.userId);
    if (!parent) {
      res.status(404).json({ error: 'Parent profile not found' });
      return;
    }

    const { housingStatus, roomRentShare, roomAvailableDate, roomDescription, roomPhotoUrl } =
      req.body;

    // When clearing housing status, clear all room fields
    if (housingStatus === null) {
      await ParentModel.update(parent.id, {
        housing_status: null,
        room_rent_share: null as unknown as number,
        room_available_date: null as unknown as Date,
        room_description: null as unknown as string,
        room_photo_url: null as unknown as string,
      });

      res.json({
        success: true,
        profile: { housingStatus: null },
      });
      return;
    }

    const updateData: Record<string, unknown> = {
      housing_status: housingStatus,
    };

    if (roomRentShare !== undefined) updateData.room_rent_share = roomRentShare;
    if (roomAvailableDate !== undefined) updateData.room_available_date = roomAvailableDate;
    if (roomDescription !== undefined) updateData.room_description = sanitizeHTML(roomDescription);
    if (roomPhotoUrl !== undefined) updateData.room_photo_url = roomPhotoUrl;

    await ParentModel.update(parent.id, updateData);

    res.json({
      success: true,
      profile: {
        housingStatus,
        roomRentShare: roomRentShare ?? parent.room_rent_share,
        roomAvailableDate: roomAvailableDate ?? parent.room_available_date,
        roomDescription: roomDescription ?? parent.room_description,
      },
    });
  }),

  /**
   * PUT /api/profile/progressive
   * Update profile with additional data from contextual prompts.
   * Recalculates profile_completion_percentage after update.
   */
  updateProgressiveProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parent = await ParentModel.findByUserId(req.userId);
    if (!parent) {
      res.status(404).json({ error: 'Parent profile not found' });
      return;
    }

    const {
      scheduleType,
      workFromHome,
      parentingStyle,
      bio,
      occupation,
      dateOfBirth,
      childrenCount,
      childrenAgeGroups,
      moveInDate,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (scheduleType !== undefined) updateData.work_schedule = { type: scheduleType };
    if (workFromHome !== undefined) updateData.work_from_home = workFromHome;
    if (parentingStyle !== undefined) updateData.parenting_style = parentingStyle;
    if (bio !== undefined) updateData.bio = sanitizeHTML(bio);
    if (occupation !== undefined) updateData.occupation = occupation;
    if (dateOfBirth !== undefined) updateData.date_of_birth = dateOfBirth;
    if (childrenCount !== undefined) updateData.children_count = childrenCount;
    if (childrenAgeGroups !== undefined) updateData.children_age_groups = childrenAgeGroups;
    if (moveInDate !== undefined) updateData.move_in_date = moveInDate;

    // Apply updates
    const updated = await ParentModel.update(parent.id, updateData);

    // Recalculate completion percentage
    const completionPct = calculateProfileCompletion(updated as unknown as Record<string, unknown>);
    if (completionPct !== updated.profile_completion_percentage) {
      await ParentModel.update(parent.id, { profile_completion_percentage: completionPct });
    }

    res.json({
      success: true,
      profile: {
        profileCompletionPercentage: completionPct,
      },
    });
  }),

  /**
   * Delete profile photo
   * Removes photo from S3 and clears profile photo URL
   */
  deletePhoto: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await ProfileModel.findByUserId(req.userId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (!profile.profile_image_url) {
      res.status(400).json({ error: 'No profile photo to delete' });
      return;
    }

    try {
      // Extract key from URL
      const key = profile.profile_image_url.includes('/')
        ? profile.profile_image_url.split('/').slice(-3).join('/')
        : profile.profile_image_url;

      if (key.startsWith('profile-photos/')) {
        await s3Service.deleteFile(key);
      }

      // Clear photo URL from profile
      await ProfileModel.update(profile.id, {
        profile_image_url: undefined,
      });

      logger.info('Profile photo deleted', { userId: req.userId, key });

      res.json({
        success: true,
        message: 'Profile photo deleted successfully',
      });
    } catch (error) {
      logger.error('Profile photo deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete photo. Please try again.',
      });
    }
  }),
};
