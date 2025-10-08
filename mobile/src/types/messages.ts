/**
 * Message Types
 *
 * Purpose: TypeScript type definitions for messaging system
 * Constitution: Principle I (Child Safety - NO child PII in messages)
 *
 * Created: 2025-10-08
 */

/**
 * Message status enum
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Message type enum
 */
export type MessageType = 'text' | 'image' | 'system';

/**
 * Message entity from API
 */
export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  createdAt: string;
  readAt?: string;
  status: MessageStatus;
}

/**
 * Match entity with latest message preview
 */
export interface Match {
  id: string;
  userId: string;
  firstName: string;
  profilePhoto?: string;
  lastMessage?: Message;
  unreadCount: number;
  compatibilityScore: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated messages response
 */
export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Paginated matches response
 */
export interface MatchListResponse {
  matches: Match[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Send message request payload
 */
export interface SendMessageRequest {
  content: string;
  messageType?: MessageType;
  fileUrl?: string;
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  message: Message;
}

/**
 * Mark as read response
 */
export interface ReadReceiptResponse {
  success: boolean;
  messageId: string;
  readAt: string;
}

/**
 * Socket.io event: New message received
 */
export interface MessageReceivedEvent {
  messageId: string;
  matchId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  timestamp: string;
}

/**
 * Socket.io event: Message read receipt
 */
export interface MessageReadEvent {
  messageId: string;
  matchId: string;
  readBy: string;
  readAt: string;
}

/**
 * Socket.io event: Typing indicator
 */
export interface TypingEvent {
  matchId: string;
  userId: string;
  isTyping: boolean;
}

/**
 * Socket.io event: Match created (mutual like)
 */
export interface MatchCreatedEvent {
  matchId: string;
  matchedUserId: string;
  compatibilityScore: number;
  createdAt: string;
}

/**
 * Redux state for messages
 */
export interface MessagesState {
  conversations: Record<string, Message[]>;
  matches: Match[];
  unreadCount: number;
  typingUsers: Record<string, boolean>; // matchId -> isTyping
  loading: boolean;
  error: string | null;
}

/**
 * Conversation/thread view state
 */
export interface ConversationState {
  matchId: string;
  messages: Message[];
  hasMore: boolean;
  loading: boolean;
  sending: boolean;
  error: string | null;
}
