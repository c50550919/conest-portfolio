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
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import s3Service from '../../services/s3Service';
import logger from '../../config/logger';

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

  deleteProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await ProfileModel.findByUserId(req.userId);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    await ProfileModel.delete(profile.id);

    res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
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
