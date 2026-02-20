/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Payment API Client
 *
 * Implements payment endpoints for verification payments
 *
 * Constitution Principles:
 * - Principle III: Security (PCI compliance, no card data storage)
 * - Principle IV: Performance (<200ms API calls P95)
 *
 * Endpoints:
 * - POST /api/payments/verification/create-intent
 * - GET /api/payments/verification/status
 */

import apiClient from '../../config/api';

// Response types
export interface VerificationPaymentIntentResponse {
  success: boolean;
  data: {
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    amountFormatted: string;
    verificationPaymentId: string;
  };
}

export interface VerificationPaymentStatusResponse {
  success: boolean;
  data: {
    hasPaid: boolean;
    status: 'none' | 'pending' | 'succeeded' | 'failed' | 'refunded';
    payment?: {
      id: string;
      amount: number;
      paidAt: string | null;
      refundAmount: number;
      refundReason: string | null;
    };
  };
}

// Error messages for user display
const ERROR_MESSAGES: Record<string, string> = {
  VERIFICATION_ALREADY_PAID: 'You have already paid for verification.',
  USER_NOT_FOUND: 'User account not found. Please try logging in again.',
  RATE_LIMITED: 'Too many requests. Please try again in a few minutes.',
  VERIFICATION_PAYMENT_CREATION_FAILED: 'Failed to create payment. Please try again.',
};

class PaymentAPI {
  /**
   * Create a verification payment intent ($39)
   * POST /api/payments/verification/create-intent
   *
   * @param connectionRequestId - Optional connection request to link payment to
   * @param idempotencyKey - Optional key for duplicate prevention
   */
  async createVerificationPaymentIntent(params?: {
    connectionRequestId?: string;
    idempotencyKey?: string;
  }): Promise<VerificationPaymentIntentResponse['data']> {
    try {
      const response = await apiClient.post<VerificationPaymentIntentResponse>(
        '/api/payments/verification/create-intent',
        {
          connectionRequestId: params?.connectionRequestId,
          idempotencyKey: params?.idempotencyKey,
        }
      );

      return response.data.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get verification payment status for current user
   * GET /api/payments/verification/status
   */
  async getVerificationPaymentStatus(): Promise<VerificationPaymentStatusResponse['data']> {
    try {
      const response = await apiClient.get<VerificationPaymentStatusResponse>(
        '/api/payments/verification/status'
      );

      return response.data.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate a Google Play / App Store receipt with backend
   * POST /api/billing/validate
   *
   * @param receipt - Receipt data from in-app purchase
   */
  async validateReceipt(receipt: {
    productId: string;
    purchaseToken: string;
    transactionId: string;
    platform: 'android' | 'ios';
  }): Promise<{ valid: boolean; verificationPaymentId?: string }> {
    try {
      const response = await apiClient.post('/api/billing/validate', receipt);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors and transform to user-friendly messages
   */
  private handleError(error: any): Error {
    // Handle rate limiting
    if (error.response?.status === 429) {
      const err = new Error('RATE_LIMITED');
      (err as any).userMessage = ERROR_MESSAGES.RATE_LIMITED;
      return err;
    }

    // Handle specific error codes from backend
    const errorCode = error.response?.data?.error;
    const userMessage = ERROR_MESSAGES[errorCode];

    if (userMessage) {
      const err = new Error(errorCode);
      (err as any).userMessage = userMessage;
      return err;
    }

    // Fallback to backend message or generic error
    const message = error.response?.data?.message || error.message || 'An error occurred';
    const err = new Error(message);
    (err as any).userMessage = message;
    return err;
  }
}

export const paymentAPI = new PaymentAPI();
export default paymentAPI;
