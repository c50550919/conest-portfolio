/**
 * Messages API Service
 *
 * Purpose: API client for messaging functionality
 * Constitution: Principle I (Child Safety - NO child PII in messages)
 *              Principle IV (Performance - optimistic updates, retry queue)
 *
 * Endpoints:
 * - GET /api/messages/history/:matchId - Fetch message history with pagination
 * - POST /api/messages/:matchId - Send new message
 * - PATCH /api/messages/:messageId/read - Mark message as read
 *
 * Created: 2025-10-08
 */

import axios, { AxiosInstance } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image';
  fileUrl?: string;
  createdAt: string;
  readAt?: string;
  status: 'sending' | 'sent' | 'failed';
}

export interface Match {
  id: string;
  userId: string;
  firstName: string;
  profilePhoto?: string;
  lastMessage?: Message;
  unreadCount: number;
  compatibilityScore: number;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MatchListResponse {
  matches: Match[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SendMessageRequest {
  content: string;
  messageType?: 'text' | 'image';
  fileUrl?: string;
}

export interface SendMessageResponse {
  message: Message;
}

export interface ReadReceiptResponse {
  success: boolean;
  messageId: string;
  readAt: string;
}

/**
 * Messages API Client
 * Handles all messaging-related API calls with retry queue for offline support
 */
class MessagesAPI {
  private client: AxiosInstance;
  private retryQueue: Map<string, { request: () => Promise<any>; retries: number }>;
  private maxRetries: number = 3;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.retryQueue = new Map();
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await tokenStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired - handle logout
          await tokenStorage.clearTokens();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get list of matches with latest message preview
   * @param cursor - Pagination cursor (UUID of last match)
   * @param limit - Number of matches to fetch (1-50, default 20)
   * @returns Match list with latest messages
   */
  async getMatches(
    cursor?: string,
    limit: number = 20
  ): Promise<MatchListResponse> {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.client.get<MatchListResponse>('/messages/matches', {
      params,
    });

    return response.data;
  }

  /**
   * Get message history for a specific match
   * @param matchId - UUID of match/conversation
   * @param cursor - Pagination cursor (UUID of last message)
   * @param limit - Number of messages to fetch (1-100, default 50)
   * @returns Message history and next cursor
   */
  async getHistory(
    matchId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<MessagesResponse> {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.client.get<MessagesResponse>(
      `/messages/history/${matchId}`,
      { params }
    );

    return response.data;
  }

  /**
   * Send a new message
   * @param matchId - UUID of match/conversation
   * @param content - Message content (text or image URL)
   * @param messageType - Type of message (text or image)
   * @returns Sent message with server-assigned ID
   */
  async sendMessage(
    matchId: string,
    content: string,
    messageType: 'text' | 'image' = 'text',
    fileUrl?: string
  ): Promise<SendMessageResponse> {
    const payload: SendMessageRequest = {
      content,
      messageType,
      fileUrl,
    };

    try {
      const response = await this.client.post<SendMessageResponse>(
        `/messages/${matchId}`,
        payload
      );
      return response.data;
    } catch (error) {
      // Add to retry queue on failure
      const requestId = `${matchId}-${Date.now()}`;
      this.addToRetryQueue(requestId, () =>
        this.sendMessage(matchId, content, messageType, fileUrl)
      );
      throw error;
    }
  }

  /**
   * Mark a message as read
   * @param messageId - UUID of message
   * @returns Read receipt with timestamp
   */
  async markAsRead(messageId: string): Promise<ReadReceiptResponse> {
    const response = await this.client.patch<ReadReceiptResponse>(
      `/messages/${messageId}/read`
    );

    return response.data;
  }

  /**
   * Mark all messages in a conversation as read
   * @param matchId - UUID of match/conversation
   * @returns Success status
   */
  async markConversationAsRead(matchId: string): Promise<{ success: boolean }> {
    const response = await this.client.patch<{ success: boolean }>(
      `/messages/conversation/${matchId}/read`
    );

    return response.data;
  }

  /**
   * Add failed request to retry queue
   * @param requestId - Unique identifier for request
   * @param request - Function that returns the request promise
   */
  private addToRetryQueue(requestId: string, request: () => Promise<any>) {
    this.retryQueue.set(requestId, { request, retries: 0 });
  }

  /**
   * Process retry queue for failed requests
   * Called when network connection is restored
   */
  async processRetryQueue(): Promise<void> {
    const promises: Promise<any>[] = [];
    const entries = Array.from(this.retryQueue.entries());

    for (const [requestId, { request, retries }] of entries) {
      if (retries >= this.maxRetries) {
        console.warn(`Max retries reached for request ${requestId}`);
        this.retryQueue.delete(requestId);
        continue;
      }

      promises.push(
        request()
          .then(() => {
            this.retryQueue.delete(requestId);
          })
          .catch(() => {
            // Increment retry count
            const item = this.retryQueue.get(requestId);
            if (item) {
              this.retryQueue.set(requestId, {
                ...item,
                retries: item.retries + 1,
              });
            }
          })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get number of pending retries
   * @returns Number of messages in retry queue
   */
  getRetryQueueSize(): number {
    return this.retryQueue.size;
  }

  /**
   * Clear retry queue (use with caution)
   */
  clearRetryQueue(): void {
    this.retryQueue.clear();
  }
}

export default new MessagesAPI();
