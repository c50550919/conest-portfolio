/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { z } from 'zod';

/**
 * Saved Profile Validators
 *
 * Feature: 003-complete-3-critical (Saved/Bookmarked Profiles)
 * Request validation schemas using Zod
 */

// Folder enum
const folderSchema = z.enum(['Top Choice', 'Strong Maybe', 'Considering', 'Backup']);

// Create saved profile schema
export const createSavedProfileSchema = z.object({
  body: z.object({
    profile_id: z.string().uuid('Invalid profile ID format'),
    folder: folderSchema.nullable(),
    notes: z
      .string()
      .max(500, 'Notes must be 500 characters or less')
      .optional()
      .nullable(),
  }),
});

// Update saved profile schema
export const updateSavedProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid saved profile ID format'),
  }),
  body: z.object({
    folder: folderSchema.optional(),
    notes: z
      .string()
      .max(500, 'Notes must be 500 characters or less')
      .optional()
      .nullable(),
  }),
});

// Delete saved profile schema
export const deleteSavedProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid saved profile ID format'),
  }),
});

// Get saved profiles schema
export const getSavedProfilesSchema = z.object({
  query: z.object({
    folder: folderSchema.optional(),
  }).optional(),
});

// Compare profiles schema
export const compareProfilesSchema = z.object({
  query: z.object({
    ids: z
      .string()
      .refine((val) => {
        const ids = val.split(',');
        return ids.length >= 2 && ids.length <= 4;
      }, 'Must provide 2-4 profile IDs')
      .transform((val) => val.split(','))
      .refine((ids) => ids.every((id) => z.string().uuid().safeParse(id).success), {
        message: 'All IDs must be valid UUIDs',
      }),
  }),
});

// Type exports
export type CreateSavedProfileInput = z.infer<typeof createSavedProfileSchema>;
export type UpdateSavedProfileInput = z.infer<typeof updateSavedProfileSchema>;
export type DeleteSavedProfileInput = z.infer<typeof deleteSavedProfileSchema>;
export type GetSavedProfilesInput = z.infer<typeof getSavedProfilesSchema>;
export type CompareProfilesInput = z.infer<typeof compareProfilesSchema>;
