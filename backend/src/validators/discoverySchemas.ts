import { z } from 'zod';

/**
 * Discovery Validation Schemas
 *
 * Purpose: Request/response validation for Discovery Screen endpoints
 * Constitution: Principle I (Child Safety - validate NO child PII)
 *
 * Updated: 2025-10-08 (added ProfileCard response validation with strict child safety)
 */

// ========================================
// REQUEST SCHEMAS
// ========================================

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

// ========================================
// RESPONSE SCHEMAS
// ========================================

/**
 * Verification Status Schema
 * Constitution: Principle I (Safety verification requirements)
 */
export const VerificationStatusSchema = z.object({
  idVerified: z.boolean(),
  backgroundCheckComplete: z.boolean(),
  phoneVerified: z.boolean(),
}).strict();

/**
 * ProfileCard Response Schema
 * Constitution: Principle I (Child Safety - CRITICAL)
 *
 * CHILD SAFETY ENFORCEMENT:
 * - ONLY childrenCount (integer) and childrenAgeGroups (generic ranges) allowed
 * - .strict() mode rejects any additional fields
 * - .refine() validation blocks child PII fields
 *
 * PROHIBITED FIELDS (will cause validation failure):
 * - childrenNames, childrenPhotos, childrenAges, childrenSchools
 * - Any field containing child-identifying information
 */
export const ProfileCardSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  firstName: z.string().min(1, 'First name is required'),
  age: z.number().int().min(18).max(100),
  city: z.string().min(1, 'City is required'),

  // FHA COMPLIANCE: Child data is OPTIONAL (user-initiated disclosure)
  // Users can choose whether to share this information
  // These fields are NOT used in algorithm scoring (preference-based only)
  childrenCount: z.number().int().min(0).max(10).optional(),
  childrenAgeGroups: z.array(
    z.enum(['toddler', 'elementary', 'teen'], {
      errorMap: () => ({
        message: 'Age groups must be: toddler, elementary, or teen',
      }),
    })
  ).optional(),

  // Matching data
  compatibilityScore: z.number().int().min(0).max(100),
  verificationStatus: VerificationStatusSchema,

  // Optional fields
  budget: z.number().positive().optional(),
  moveInDate: z.string().datetime().optional(),
  bio: z.string().max(500).optional(),
  profilePhoto: z.string().url().optional(),
})
  .strict() // Reject any fields not defined above
  .refine(
    (data) => {
      // CRITICAL: Ensure no child PII fields present
      const prohibitedFields = [
        'childrenNames',
        'childrenPhotos',
        'childrenAges',
        'childrenSchools',
        'childNames',
        'childPhotos',
        'childAges',
        'childSchools',
      ];

      const dataKeys = Object.keys(data);
      const hasPII = prohibitedFields.some(field => dataKeys.includes(field));

      return !hasPII;
    },
    {
      message: 'CHILD SAFETY VIOLATION: Profile contains prohibited child PII fields',
    }
  );

/**
 * Discovery Response Schema
 * Response for GET /api/discovery/profiles
 */
export const DiscoveryResponseSchema = z.object({
  profiles: z.array(ProfileCardSchema).max(50, 'Maximum 50 profiles per request'),
  nextCursor: z.string().uuid().nullable(),
}).strict();

/**
 * Match Response Schema
 * Response for POST /api/discovery/swipe (when mutual match occurs)
 */
export const MatchResponseSchema = z.object({
  match: z.object({
    id: z.string().uuid(),
    userId1: z.string().uuid(),
    userId2: z.string().uuid(),
    compatibilityScore: z.number().int().min(0).max(100),
    breakdown: z.object({
      schedule: z.number().int().min(0).max(100),
      parenting: z.number().int().min(0).max(100),
      rules: z.number().int().min(0).max(100),
      location: z.number().int().min(0).max(100),
      budget: z.number().int().min(0).max(100),
      lifestyle: z.number().int().min(0).max(100),
    }).strict(),
    createdAt: z.string().datetime(),
  }).strict(),
}).strict();

// ========================================
// TYPE EXPORTS
// ========================================

export type GetProfilesQuery = z.infer<typeof GetProfilesQuerySchema>;
export type SwipeBody = z.infer<typeof SwipeBodySchema>;
export type ScreenshotBody = z.infer<typeof ScreenshotBodySchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type ProfileCard = z.infer<typeof ProfileCardSchema>;
export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
export type MatchResponse = z.infer<typeof MatchResponseSchema>;
