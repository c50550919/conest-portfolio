/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Enhanced Messages API Service
 *
 * Purpose: API client for enhanced messaging with verification and moderation
 * Features:
 * - Verification-enforced messaging
 * - Message reporting
 * - Conversation management
 * - Admin moderation support
 *
 * Created: 2025-11-14
 */

import axios, { AxiosInstance } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// ============ Types ============

export interface EnhancedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  read: boolean;
  readAt?: string;
  sentAt: string;
  moderationStatus?: 'auto_approved' | 'pending' | 'approved' | 'rejected';
  flaggedForReview?: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string;
  participantVerified: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isBlocked: boolean;
  isMuted: boolean;
  bothVerified: boolean;
}

export interface VerificationStatus {
  isVerified: boolean;
  verificationScore: number;
  canMessage: boolean;
}

export interface SendVerifiedMessageRequest {
  conversationId: string;
  recipientId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string;
  metadata?: Record<string, any>;
}

export interface ReportMessageRequest {
  messageId: string;
  reportType:
    | 'inappropriate_content'
    | 'harassment'
    | 'spam'
    | 'scam'
    | 'child_safety_concern'
    | 'other';
  description?: string;
}

/**
 * Gated messages response
 * When locked=true, user must verify to view message content
 */
export interface GatedMessagesResponse {
  success: boolean;
  locked: boolean;
  // When locked=true
  unreadCount?: number;
  message?: string;
  // When locked=false
  data?: EnhancedMessage[];
}

/**
 * Unread count response with verification gating
 */
export interface UnreadCountResponse {
  success: boolean;
  locked: boolean;
  unreadCount: number;
  message?: string;
}

// ============ API Client ============

class EnhancedMessagesAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token with retry logic
    this.client.interceptors.request.use(
      async (config) => {
        let token = await tokenStorage.getAccessToken();

        // If token not found, retry once after a small delay (handles race conditions)
        if (!token) {
          console.log('[EnhancedMessagesAPI] Token not found, retrying in 100ms...');
          await new Promise((resolve) => setTimeout(resolve, 100));
          token = await tokenStorage.getAccessToken();
        }

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          (config as any)._tokenSent = true;
        } else {
          console.warn('[EnhancedMessagesAPI] No token available for request:', config.url);
          (config as any)._tokenSent = false;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const tokenWasSent = error.config?._tokenSent;

        if (error.response?.status === 401) {
          // Only clear tokens if we actually sent a token and it was rejected
          if (tokenWasSent) {
            console.log('[EnhancedMessagesAPI] Token was rejected by server, clearing tokens');
            await tokenStorage.clearTokens();
          } else {
            console.log('[EnhancedMessagesAPI] No token was sent, not clearing tokens');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a verified message (both users must be verified)
   */
  async sendVerifiedMessage(
    params: SendVerifiedMessageRequest
  ): Promise<{ success: boolean; data: EnhancedMessage }> {
    const response = await this.client.post<{ success: boolean; data: EnhancedMessage }>(
      '/messages/verified',
      params
    );
    return response.data;
  }

  /**
   * Get all conversations for the authenticated user
   * Includes verification status and unread counts
   */
  async getConversations(): Promise<{ success: boolean; data: Conversation[]; count: number }> {
    const response = await this.client.get<{
      success: boolean;
      data: Conversation[];
      count: number;
    }>('/messages/conversations');
    return response.data;
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(
    conversationId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{ success: boolean; data: EnhancedMessage[] }> {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.client.get<{ success: boolean; data: EnhancedMessage[] }>(
      `/messages/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data;
  }

  /**
   * Check verification status of a user
   */
  async checkVerificationStatus(
    userId: string
  ): Promise<{ success: boolean; data: VerificationStatus }> {
    const response = await this.client.get<{ success: boolean; data: VerificationStatus }>(
      `/messages/verification-status/${userId}`
    );
    return response.data;
  }

  /**
   * Report a message for moderation review
   */
  async reportMessage(
    params: ReportMessageRequest,
  ): Promise<{ success: boolean; message: string }> {
    const { messageId, ...body } = params;
    const response = await this.client.post<{ success: boolean; message: string }>(
      `/messages/${messageId}/report`,
      body
    );
    return response.data;
  }

  /**
   * Block a conversation
   */
  async blockConversation(conversationId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(
      `/messages/conversations/${conversationId}/block`
    );
    return response.data;
  }

  /**
   * Mark a conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<{ success: boolean }> {
    const response = await this.client.patch<{ success: boolean }>(
      `/messages/conversations/${conversationId}/read`
    );
    return response.data;
  }

  /**
   * Mark a specific message as read
   */
  async markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
    const response = await this.client.patch<{ success: boolean }>(`/messages/${messageId}/read`);
    return response.data;
  }

  /**
   * Get messages with verification gating
   *
   * For verified users: Returns full message content
   * For unverified users: Returns locked response with unread count only
   *
   * Enables asymmetric messaging:
   * - Verified users can send to anyone
   * - Unverified users can receive but must verify to view/reply
   */
  async getMessagesGated(conversationId: string): Promise<GatedMessagesResponse> {
    const response = await this.client.get<GatedMessagesResponse>(
      `/messages/conversations/${conversationId}/gated`
    );
    return response.data;
  }

  /**
   * Get total unread message count with verification gating
   *
   * Both verified and unverified users can see the count
   * Unverified users get a prompt to verify to view messages
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await this.client.get<UnreadCountResponse>('/messages/unread-count');
    return response.data;
  }
}

// Export singleton instance
const enhancedMessagesAPI = new EnhancedMessagesAPI();
export default enhancedMessagesAPI;

// Export class for testing
export { EnhancedMessagesAPI };
