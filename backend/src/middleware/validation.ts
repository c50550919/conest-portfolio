/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    res.status(500).json({ error: 'Validation error' });
  }
};

// Common validation schemas
export const schemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      phone: z.string().optional(),
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  }),

  createProfile: z.object({
    body: z.object({
      first_name: z.string().min(1, 'First name is required'),
      last_name: z.string().min(1, 'Last name is required'),
      date_of_birth: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }),
      city: z.string().min(1, 'City is required'),
      state: z.string().length(2, 'State must be 2 characters'),
      zip_code: z.string().regex(/^\d{5}$/, 'Invalid zip code'),
      budget_min: z.number().min(0, 'Budget must be positive'),
      budget_max: z.number().min(0, 'Budget must be positive'),
      // FHA COMPLIANCE: Child data is now OPTIONAL (user-initiated disclosure)
      // Users can choose to share this information, platform does not require it
      children_count: z.number().int().min(0).optional(),
      children_age_groups: z.string().optional(),
      schedule_type: z.enum(['flexible', 'fixed', 'shift_work']),
      work_from_home: z.boolean(),
    }),
  }),

  updateProfile: z.object({
    body: z.object({
      bio: z.string().max(500).optional(),
      budget_min: z.number().min(0).optional(),
      budget_max: z.number().min(0).optional(),
      parenting_style: z.string().optional(),
      dietary_preferences: z.string().optional(),
      house_rules: z.string().optional(),
    }),
  }),

  createMessage: z.object({
    body: z.object({
      recipient_id: z.string().uuid(),
      content: z.string().min(1).max(2000),
      message_type: z.enum(['text', 'image', 'file']).optional(),
    }),
  }),

  // Slim Onboarding Endpoints
  updateLocation: z.object({
    body: z.object({
      city: z.string().min(2, 'City must be at least 2 characters').max(100, 'City must be at most 100 characters'),
      state: z.string().length(2, 'State must be a 2-letter code'),
      zipCode: z.string().regex(/^\d{5}$/, 'Zip code must be 5 digits'),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    }),
  }),

  updateBudget: z.object({
    body: z.object({
      budgetMin: z.number().int().min(0, 'Budget minimum must be non-negative').max(50000),
      budgetMax: z.number().int().min(0, 'Budget maximum must be non-negative').max(50000),
    }).refine((data) => data.budgetMax >= data.budgetMin, {
      message: 'Budget maximum must be greater than or equal to minimum',
      path: ['budgetMax'],
    }),
  }),

  updateHousingStatus: z.object({
    body: z.object({
      housingStatus: z.enum(['has_room', 'looking']).nullable(),
      roomRentShare: z.number().int().min(0).max(50000).optional(),
      roomAvailableDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
      roomDescription: z.string().max(200, 'Room description must be at most 200 characters').optional(),
      roomPhotoUrl: z.string().url().nullable().optional(),
    }).refine((data) => {
      if (data.housingStatus === 'has_room' && (data.roomRentShare === undefined || data.roomRentShare === null)) {
        return false;
      }
      return true;
    }, {
      message: 'roomRentShare is required when housingStatus is has_room',
      path: ['roomRentShare'],
    }),
  }),

  updateProgressiveProfile: z.object({
    body: z.object({
      scheduleType: z.enum(['flexible', 'fixed', 'shift']).optional(),
      workFromHome: z.boolean().optional(),
      parentingStyle: z.string().max(100).optional(),
      bio: z.string().min(20, 'Bio must be at least 20 characters').max(500, 'Bio must be at most 500 characters').optional(),
      occupation: z.string().min(2).max(100).optional(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional()
        .refine((val) => {
          if (!val) return true;
          const dob = new Date(val);
          const now = new Date();
          const age = now.getFullYear() - dob.getFullYear();
          const monthDiff = now.getMonth() - dob.getMonth();
          const adjustedAge = monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate()) ? age - 1 : age;
          return adjustedAge >= 18;
        }, { message: 'Must be at least 18 years old' }),
      childrenCount: z.number().int().min(0).max(10).optional(),
      childrenAgeGroups: z.array(z.enum(['toddler', 'elementary', 'teen'])).optional(),
      moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
    }),
  }),
};
