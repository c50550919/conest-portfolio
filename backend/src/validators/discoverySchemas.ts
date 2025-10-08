import { z } from 'zod';

/**
 * Discovery Validation Schemas
 *
 * Purpose: Request validation for Discovery Screen endpoints
 * Constitution: Principle I (Child Safety - validate NO child PII)
 *
 * Updated: 2025-10-06 (removed undo schema - no undo in MVP)
 */

// GET /api/discovery/profiles query params
export const GetProfilesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 10))
    .refine(val => val >= 1 && val <= 50, {
      message: 'Limit must be between 1 and 50',
    }),
  cursor: z
    .string()
    .uuid('Cursor must be a valid UUID')
    .optional(),
});

// POST /api/discovery/swipe body
export const SwipeBodySchema = z.object({
  targetUserId: z.string().uuid('Target user ID must be a valid UUID'),
  direction: z.enum(['left', 'right'], {
    errorMap: () => ({ message: 'Direction must be "left" or "right"' }),
  }),
});

// POST /api/discovery/screenshot body
export const ScreenshotBodySchema = z.object({
  targetUserId: z.string().uuid('Target user ID must be a valid UUID'),
});

// Type exports
export type GetProfilesQuery = z.infer<typeof GetProfilesQuerySchema>;
export type SwipeBody = z.infer<typeof SwipeBodySchema>;
export type ScreenshotBody = z.infer<typeof ScreenshotBodySchema>;
