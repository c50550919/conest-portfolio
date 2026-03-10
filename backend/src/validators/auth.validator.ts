/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Auth Request Validators (Zod schemas)
 * Constitution Principle I: Child Safety - REJECT prohibited child PII
 */

import { z } from 'zod';

const PROHIBITED_FIELDS = ['childrenNames', 'childrenAges', 'childrenPhotos', 'childrenSchools'];

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/)
      .optional(), // Phone is optional
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    city: z.string().min(1),
    state: z.string().length(2),
    zipCode: z.string().length(5),
    childrenCount: z.number().int().min(0).max(10),
    childrenAgeGroups: z.array(z.enum(['toddler', 'elementary', 'teen'])),
  })
  .strict()
  .refine(
    (data) =>
      // Reject prohibited child PII fields
      PROHIBITED_FIELDS.every((field) => !(field in data)),
    { message: 'Prohibited child PII fields detected' },
  );

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyPhoneSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  code: z.string().length(6),
});
