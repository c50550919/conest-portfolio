/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
// Messages feature barrel file
export { MessagesService, default as messagesService } from './messages.service';
export { MessagingService } from './messaging.service';
export { EnhancedMessagingService, default as enhancedMessagingService } from './enhanced-messaging.service';
export { messageController } from './message.controller';
export { default as messageRoutes } from './messages.routes';
export { default as enhancedMessageRoutes } from './enhanced-messages.routes';

// Re-export types
export type {
  ReportMessageParams,
  AdminModerationAction,
  ConversationListItem,
} from './enhanced-messaging.service';
