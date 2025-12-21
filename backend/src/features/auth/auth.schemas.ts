import { z } from 'zod';

/**
 * Authentication Validation Schemas
 *
 * Purpose: Request validation for Authentication endpoints
 * Constitution: Principle I (Child Safety - REJECT prohibited child PII)
 *
 * CRITICAL CHILD SAFETY RULES:
 * - REJECT any fields containing child PII: childrenNames, childrenPhotos, childrenAges, childrenSchools
 * - Only allow childrenCount (integer) and childrenAgeGroups (generic ranges)
 * - Apply strict() mode to prevent additional fields
 * - Explicit validation refinement to block prohibited fields
 *
 * Password Requirements (Principle III - Security):
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 *
 * Phone Format:
 * - E.164 format: +[country code][number]
 * - Example: +14155552671
 */

// Prohibited child PII fields that must NEVER be accepted
const PROHIBITED_CHILD_PII_FIELDS = [
  'childrenNames',
  'childrenPhotos',
  'childrenAges',
  'childrenSchools',
];

/**
 * POST /api/auth/register - Registration request schema
 *
 * Fields:
 * - email: Valid email address
 * - password: Strong password (8+ chars, uppercase, lowercase, number, special)
 * - phone: E.164 format phone number
 * - firstName: User's first name (min 1 char)
 * - lastName: User's last name (min 1 char)
 * - dateOfBirth: ISO date format (YYYY-MM-DD)
 * - city: City name (min 1 char)
 * - state: 2-letter state code (e.g., "CA", "NY")
 * - zipCode: 5-digit US zip code
 * - childrenCount: Number of children (0-10)
 * - childrenAgeGroups: Array of age group categories (toddler, elementary, teen)
 *
 * CHILD SAFETY: Only childrenCount and childrenAgeGroups allowed - NO child PII
 */
export const RegisterRequestSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        'Password must contain at least one special character',
      ),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +14155552671)')
      .optional(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'State must be a 2-letter code'),
    zipCode: z.string().regex(/^\d{5}$/, 'Zip code must be 5 digits'),
    childrenCount: z
      .number()
      .int('Children count must be an integer')
      .min(0, 'Children count cannot be negative')
      .max(10, 'Children count cannot exceed 10'),
    childrenAgeGroups: z
      .array(
        z.enum(['toddler', 'elementary', 'teen'], {
          errorMap: () => ({ message: 'Age group must be toddler, elementary, or teen' }),
        }),
      )
      .min(0, 'Children age groups must be an array'),
  })
  .strict() // Reject any additional fields not defined in schema
  .refine(
    (data) =>
      // CRITICAL CHILD SAFETY: Reject if ANY prohibited child PII fields are present
      PROHIBITED_CHILD_PII_FIELDS.every((field) => !(field in data))
    ,
    {
      message:
        'CHILD SAFETY VIOLATION: Prohibited child PII fields detected (childrenNames, childrenPhotos, childrenAges, childrenSchools)',
    },
  );

/**
 * POST /api/auth/login - Login request schema
 *
 * Fields:
 * - email: Valid email address
 * - password: Non-empty password string
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/refresh - Refresh token request schema
 *
 * Fields:
 * - refreshToken: Non-empty JWT refresh token string
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /api/auth/verify-phone - Phone verification request schema
 *
 * Fields:
 * - phone: E.164 format phone number
 * - code: 6-digit verification code
 */
export const VerifyPhoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +14155552671)'),
  code: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
});

// Type exports for TypeScript type inference
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;
export type VerifyPhoneRequest = z.infer<typeof VerifyPhoneSchema>;
