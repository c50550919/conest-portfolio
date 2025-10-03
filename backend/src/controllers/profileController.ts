import { Response } from 'express';
import { ProfileModel } from '../models/Profile';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

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
      number_of_children: profile.number_of_children,
      ages_of_children: profile.ages_of_children,
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
};
