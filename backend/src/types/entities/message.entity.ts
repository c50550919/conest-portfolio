/**
 * Message Entity - Canonical Type Definitions
 *
 * Database Tables: messages, conversations
 * Constitution Principle I: Child Safety - NO child PII in messages
 * Constitution Principle III: Security - Messages encrypted at rest
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type MessageTypeDB = 'text' | 'image' | 'file';

export interface MessageDB {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string; // Encrypted content
  message_type: MessageTypeDB;
  file_url?: string;
  read: boolean;
  read_at?: Date;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationDB {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at?: Date;
  last_message_preview?: string;
  both_verified?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageDB {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: MessageTypeDB;
  file_url?: string;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Message API response type
 */
export interface Message {
  id: string;
  conversationId: string;
  matchId?: string; // Alias for conversationId (backward compatibility)
  senderId: string;
  content: string; // Decrypted content
  messageType: MessageType;
  fileUrl?: string;
  read: boolean;
  readAt?: string; // ISO date string
  status: MessageStatus;
  sentAt: string; // Alias for createdAt
  createdAt: string; // ISO date string
}

/**
 * Conversation/thread overview
 */
export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  otherParticipant?: ConversationParticipant;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  bothVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  firstName: string;
  profilePhoto?: string;
  verificationStatus?: {
    idVerified: boolean;
    backgroundCheckComplete: boolean;
  };
}

/**
 * Match with conversation preview (for inbox list)
 */
export interface MatchConversation {
  id: string;
  matchId: string;
  userId: string;
  firstName: string;
  profilePhoto?: string;
  lastMessage?: Message;
  unreadCount: number;
  compatibilityScore: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Request/Response Types
// =============================================================================

export interface SendMessageRequest {
  matchId?: string; // or conversationId
  conversationId?: string;
  content: string;
  messageType?: MessageType;
  fileUrl?: string;
}

export interface SendMessageResponse {
  message: Message;
}

export interface GetMessagesRequest {
  matchId?: string;
  conversationId?: string;
  limit?: number;
  cursor?: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface MarkAsReadRequest {
  messageId?: string;
  conversationId?: string;
  matchId?: string;
}

export interface ReadReceiptResponse {
  success: boolean;
  messageId?: string;
  readAt: string;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
  matches?: MatchConversation[]; // Alias for backward compatibility
  nextCursor: string | null;
  hasMore: boolean;
}

// =============================================================================
// Socket.io Event Types
// =============================================================================

export interface MessageReceivedEvent {
  messageId: string;
  matchId: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  timestamp: string;
}

export interface MessageReadEvent {
  messageId: string;
  matchId: string;
  conversationId: string;
  readBy: string;
  readAt: string;
}

export interface TypingEvent {
  matchId: string;
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface MatchCreatedEvent {
  matchId: string;
  conversationId: string;
  matchedUserId: string;
  compatibilityScore: number;
  createdAt: string;
}

// =============================================================================
// Constants
// =============================================================================

export const MESSAGE_CONSTANTS = {
  MAX_CONTENT_LENGTH: 5000,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  DEFAULT_MESSAGES_LIMIT: 50,
  MAX_MESSAGES_LIMIT: 100,
} as const;
