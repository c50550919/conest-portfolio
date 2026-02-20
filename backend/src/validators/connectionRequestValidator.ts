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
 * Connection Request Validators
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * Request validation schemas using Zod
 */

// Status enum
const statusSchema = z.enum(['pending', 'accepted', 'declined', 'expired', 'cancelled']);

// Create connection request schema
export const createConnectionRequestSchema = z.object({
  body: z.object({
    recipient_id: z.string().uuid('Invalid recipient ID format'),
    message: z
      .string()
      .min(1, 'Message is required')
      .max(500, 'Message must be 500 characters or less')
      .trim(),
  }),
});

// Get received requests schema
export const getReceivedRequestsSchema = z.object({
  query: z.object({
    status: statusSchema.optional(),
  }),
});

// Get sent requests schema
export const getSentRequestsSchema = z.object({
  query: z.object({
    status: statusSchema.optional(),
  }),
});

// Accept request schema
export const acceptRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid connection request ID format'),
  }),
  body: z.object({
    response_message: z
      .string()
      .max(500, 'Response message must be 500 characters or less')
      .optional()
      .nullable(),
  }),
});

// Decline request schema
export const declineRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid connection request ID format'),
  }),
  body: z.object({
    response_message: z
      .string()
      .max(500, 'Response message must be 500 characters or less')
      .optional()
      .nullable(),
  }),
});

// Cancel request schema
export const cancelRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid connection request ID format'),
  }),
});

// Type exports
export type CreateConnectionRequestInput = z.infer<typeof createConnectionRequestSchema>;
export type GetReceivedRequestsInput = z.infer<typeof getReceivedRequestsSchema>;
export type GetSentRequestsInput = z.infer<typeof getSentRequestsSchema>;
export type AcceptRequestInput = z.infer<typeof acceptRequestSchema>;
export type DeclineRequestInput = z.infer<typeof declineRequestSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
