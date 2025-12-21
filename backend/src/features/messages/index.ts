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
