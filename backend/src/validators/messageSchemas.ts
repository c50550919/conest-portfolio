/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * T063: Message Zod Validation Schemas
 *
 * Provides Zod schemas for message endpoints validation.
 *
 * Constitution Principle III (Security) - Input validation
 * Constitution Principle I (Child Safety) - NO child PII in messages
 *
 * Created: 2025-10-08 (Wave 4: Real-time Messaging)
 */

import { z } from 'zod';

/**
 * Send message request schema
 * POST /api/messages
 */
export const SendMessageSchema = z.object({
  matchId: z.string().uuid('Invalid matchId format'),
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(5000, 'Message content cannot exceed 5000 characters')
    .trim()
    .refine((val) => val.length > 0, {
      message: 'Message content cannot be whitespace only',
    }),
  messageType: z
    .enum(['text', 'image', 'file'], {
      errorMap: () => ({ message: 'Invalid messageType. Must be text, image, or file' }),
    })
    .optional()
    .default('text'),
  fileUrl: z.string().url('Invalid fileUrl format').optional().nullable(),
});

export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

/**
 * Get message history query schema
 * GET /api/messages/:matchId/history
 */
export const GetMessageHistorySchema = z.object({
  params: z.object({
    matchId: z.string().uuid('Invalid matchId format'),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => val >= 1 && val <= 100, {
        message: 'Limit must be between 1 and 100',
      }),
    cursor: z.string().uuid('Invalid cursor format').optional(),
  }),
});

export type GetMessageHistoryParams = z.infer<typeof GetMessageHistorySchema>;

/**
 * Match ID param schema (reusable)
 */
export const MatchIdParamSchema = z.object({
  matchId: z.string().uuid('Invalid matchId format'),
});

/**
 * Typing indicator event schema
 * Socket.io events: typing:start, typing:stop
 */
export const TypingIndicatorSchema = z.object({
  matchId: z.string().uuid('Invalid matchId format'),
  recipientId: z.string().uuid('Invalid recipientId format'),
});

export type TypingIndicatorEvent = z.infer<typeof TypingIndicatorSchema>;

/**
 * Message response schema (for documentation/testing)
 */
export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(), // Decrypted content
  messageType: z.enum(['text', 'image', 'file']).default('text'),
  fileUrl: z.string().url().nullable().optional(),
  read: z.boolean(),
  readAt: z.string().datetime().nullable().optional(),
  sentAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

/**
 * Message history response schema
 */
export const MessageHistoryResponseSchema = z.object({
  messages: z.array(MessageResponseSchema),
  nextCursor: z.string().uuid().nullable().optional(),
  totalCount: z.number().int().nonnegative().optional(),
});

export type MessageHistoryResponse = z.infer<typeof MessageHistoryResponseSchema>;
