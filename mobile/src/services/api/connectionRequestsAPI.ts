/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Connection Requests API Service
 *
 * Purpose: API client for connection request feature (send/accept/decline connection requests)
 * Feature: 003-complete-3-critical (ConnectionRequest API client)
 * Task: T033
 *
 * Endpoints:
 * - POST /api/connection-requests - Send connection request with encrypted message
 * - GET /api/connection-requests/received - Get received requests by status
 * - GET /api/connection-requests/sent - Get sent requests by status
 * - GET /api/connection-requests/:id/message - Get decrypted message
 * - GET /api/connection-requests/:id/response-message - Get decrypted response message
 * - PATCH /api/connection-requests/:id/accept - Accept with optional response
 * - PATCH /api/connection-requests/:id/decline - Decline with optional response
 * - PATCH /api/connection-requests/:id/cancel - Cancel sent request
 * - GET /api/connection-requests/rate-limit-status - Check daily/weekly limits
 * - GET /api/connection-requests/statistics - Get request statistics
 *
 * Rate Limits:
 * - 5 connection requests per day
 * - 15 connection requests per week
 *
 * Created: 2025-10-14
 */

import axios, { AxiosInstance } from 'axios';
import tokenStorage from '../tokenStorage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  message_encrypted: string;
  message_iv: string;
  response_message_encrypted: string | null;
  response_message_iv: string | null;
  sent_at: string;
  responded_at: string | null;
  expires_at: string;
  // Profile data (joined from profiles table)
  senderProfile?: {
    firstName: string;
    age: number;
    city: string;
    childrenCount: number;
    compatibilityScore: number;
    profilePhoto?: string;
  };
  recipientProfile?: {
    firstName: string;
    age: number;
    city: string;
    childrenCount: number;
    compatibilityScore: number;
    profilePhoto?: string;
  };
}

export interface RateLimitStatus {
  daily: number;
  weekly: number;
}

export interface ConnectionRequestStatistics {
  sent: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
    cancelled: number;
  };
  received: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  };
  rateLimit: RateLimitStatus;
}

class ConnectionRequestsAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/connection-requests`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for adding auth token with retry logic
    this.client.interceptors.request.use(
      async (config) => {
        let token = await tokenStorage.getAccessToken();

        // If token not found, retry once after a small delay (handles race conditions)
        if (!token) {
          console.log('[ConnectionRequestsAPI] Token not found, retrying in 100ms...');
          await new Promise((resolve) => setTimeout(resolve, 100));
          token = await tokenStorage.getAccessToken();
        }

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          // Mark that we sent a token (for response interceptor)
          (config as any)._tokenSent = true;
        } else {
          console.warn('[ConnectionRequestsAPI] No token available for request:', config.url);
          (config as any)._tokenSent = false;
        }
        return config;
      },
      (error) => {
        console.error('[ConnectionRequestsAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const tokenWasSent = error.config?._tokenSent;

        console.error('[ConnectionRequestsAPI] Response error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
          tokenWasSent,
        });

        // Map backend error codes to user-friendly messages
        if (error.response?.status === 401) {
          // Only clear tokens if we actually sent a token and it was rejected
          // Don't clear if we couldn't retrieve the token in the first place
          if (tokenWasSent) {
            console.log('[ConnectionRequestsAPI] Token was rejected by server, clearing tokens');
            await tokenStorage.clearTokens();
            throw new Error('Authentication required. Please log in again.');
          } else {
            // Token wasn't sent - don't clear, just report the error
            console.log('[ConnectionRequestsAPI] No token was sent, not clearing tokens');
            throw new Error('Unable to authenticate. Please try logging in again.');
          }
        } else if (error.response?.status === 400) {
          const errorMessage = error.response?.data?.error || 'Invalid request';
          if (errorMessage.includes('MESSAGE_REQUIRED')) {
            throw new Error('Please include a message with your connection request');
          } else if (errorMessage.includes('MESSAGE_TOO_LONG')) {
            throw new Error('Message is too long. Please keep it under 500 characters.');
          } else if (errorMessage.includes('RESPONSE_MESSAGE_TOO_LONG')) {
            throw new Error('Response message is too long. Please keep it under 500 characters.');
          }
          throw new Error(errorMessage);
        } else if (error.response?.status === 404) {
          throw new Error('Connection request not found');
        } else if (error.response?.status === 409) {
          throw new Error('You already have a pending connection request with this user');
        } else if (error.response?.status === 429) {
          const errorMessage = error.response?.data?.error || '';
          if (errorMessage.includes('daily')) {
            throw new Error(
              'You have reached your daily limit of 5 connection requests. Try again tomorrow.',
            );
          } else if (errorMessage.includes('weekly')) {
            throw new Error(
              'You have reached your weekly limit of 15 connection requests. Try again next week.',
            );
          }
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a connection request with a message
   * @param recipientId - UUID of the recipient
   * @param message - Message to send (max 500 chars)
   * @returns Created connection request
   */
  async sendConnectionRequest(recipientId: string, message: string): Promise<ConnectionRequest> {
    if (!message || message.trim().length === 0) {
      throw new Error('Please include a message with your connection request');
    }

    if (message.length > 500) {
      throw new Error('Message is too long. Please keep it under 500 characters.');
    }

    const response = await this.client.post<{ success: boolean; data: ConnectionRequest }>('/', {
      recipient_id: recipientId,
      message,
    });

    return response.data.data;
  }

  /**
   * Get connection requests received by the current user
   * @param status - Optional status filter (pending, accepted, declined, expired)
   * @returns Array of received connection requests
   */
  async listReceivedRequests(status?: string): Promise<ConnectionRequest[]> {
    const params = status ? { status } : {};
    const response = await this.client.get<{ success: boolean; data: any[] }>('/received', {
      params,
    });

    // Transform backend response to mobile format
    return response.data.data.map((item: any) => ({
      ...item,
      senderProfile: item.sender
        ? {
            firstName: item.sender.first_name,
            age: item.sender.age,
            city: item.sender.city,
            childrenCount: item.sender.children_count || 0,
            compatibilityScore: item.sender.verification_score || 0,
            profilePhoto: item.sender.profile_photo,
          }
        : undefined,
      recipientProfile: item.recipient
        ? {
            firstName: item.recipient.first_name,
            age: item.recipient.age,
            city: item.recipient.city,
            childrenCount: item.recipient.children_count || 0,
            compatibilityScore: item.recipient.verification_score || 0,
            profilePhoto: item.recipient.profile_photo,
          }
        : undefined,
    }));
  }

  /**
   * Get connection requests sent by the current user
   * @param status - Optional status filter (pending, accepted, declined, expired, cancelled)
   * @returns Array of sent connection requests
   */
  async listSentRequests(status?: string): Promise<ConnectionRequest[]> {
    const params = status ? { status } : {};
    const response = await this.client.get<{ success: boolean; data: any[] }>('/sent', {
      params,
    });

    // Transform backend response to mobile format
    return response.data.data.map((item: any) => ({
      ...item,
      senderProfile: item.sender
        ? {
            firstName: item.sender.first_name,
            age: item.sender.age,
            city: item.sender.city,
            childrenCount: item.sender.children_count || 0,
            compatibilityScore: item.sender.verification_score || 0,
            profilePhoto: item.sender.profile_photo,
          }
        : undefined,
      recipientProfile: item.recipient
        ? {
            firstName: item.recipient.first_name,
            age: item.recipient.age,
            city: item.recipient.city,
            childrenCount: item.recipient.children_count || 0,
            compatibilityScore: item.recipient.verification_score || 0,
            profilePhoto: item.recipient.profile_photo,
          }
        : undefined,
    }));
  }

  /**
   * Get decrypted message for a connection request
   * @param id - Connection request ID
   * @returns Decrypted message string
   */
  async getMessage(id: string): Promise<string | null> {
    const response = await this.client.get<{ success: boolean; data: { message: string | null } }>(
      `/${id}/message`,
    );
    return response.data.data.message;
  }

  /**
   * Get decrypted response message for a connection request
   * @param id - Connection request ID
   * @returns Decrypted response message string
   */
  async getResponseMessage(id: string): Promise<string | null> {
    const response = await this.client.get<{
      success: boolean;
      data: { responseMessage: string | null };
    }>(`/${id}/response-message`);
    return response.data.data.responseMessage;
  }

  /**
   * Accept a connection request with optional response message
   * @param id - Connection request ID
   * @param responseMessage - Optional response message (max 500 chars)
   * @returns Updated connection request
   */
  async acceptConnectionRequest(id: string, responseMessage?: string): Promise<ConnectionRequest> {
    if (responseMessage && responseMessage.length > 500) {
      throw new Error('Response message is too long. Please keep it under 500 characters.');
    }

    const response = await this.client.patch<{ success: boolean; data: ConnectionRequest }>(
      `/${id}/accept`,
      {
        response_message: responseMessage,
      },
    );

    return response.data.data;
  }

  /**
   * Decline a connection request with optional reason
   * @param id - Connection request ID
   * @param reason - Optional decline reason (max 500 chars)
   * @returns Updated connection request
   */
  async declineConnectionRequest(id: string, reason?: string): Promise<ConnectionRequest> {
    if (reason && reason.length > 500) {
      throw new Error('Decline reason is too long. Please keep it under 500 characters.');
    }

    const response = await this.client.patch<{ success: boolean; data: ConnectionRequest }>(
      `/${id}/decline`,
      {
        response_message: reason,
      },
    );

    return response.data.data;
  }

  /**
   * Cancel a sent connection request
   * @param id - Connection request ID
   * @returns Updated connection request
   */
  async cancelConnectionRequest(id: string): Promise<ConnectionRequest> {
    const response = await this.client.patch<{ success: boolean; data: ConnectionRequest }>(
      `/${id}/cancel`,
    );
    return response.data.data;
  }

  /**
   * Get rate limit status for the current user
   * @returns Remaining requests for today and this week
   */
  async getRateLimitStatus(): Promise<RateLimitStatus> {
    const response = await this.client.get<{ success: boolean; data: RateLimitStatus }>(
      '/rate-limit-status',
    );
    return response.data.data;
  }

  /**
   * Get connection request statistics for the current user
   * @returns Statistics for sent and received requests
   */
  async getStatistics(): Promise<ConnectionRequestStatistics> {
    const response = await this.client.get<{ success: boolean; data: ConnectionRequestStatistics }>(
      '/statistics',
    );
    return response.data.data;
  }
}

export default new ConnectionRequestsAPI();
