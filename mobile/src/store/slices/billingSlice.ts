/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Billing Redux Slice
 *
 * Manages all billing state including:
 * - Verification payment status and flow
 * - Bundle purchase state
 * - Receipt validation
 *
 * Constitution Principles:
 * - Principle II: No child data in billing
 * - Principle III: Secure payment handling
 * - Principle IV: <100ms state updates
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { paymentAPI } from '../../services/api/paymentAPI';

// Types
export interface VerificationPaymentData {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  amountFormatted: string;
  verificationPaymentId: string;
}

export interface VerificationPaymentStatus {
  hasPaid: boolean;
  status: 'none' | 'pending' | 'succeeded' | 'failed' | 'refunded';
  payment?: {
    id: string;
    amount: number;
    paidAt: string | null;
    refundAmount: number;
    refundReason: string | null;
  };
}

export interface BillingState {
  // Verification payment
  verificationPayment: {
    status: 'idle' | 'loading' | 'creating' | 'processing' | 'succeeded' | 'failed';
    data: VerificationPaymentData | null;
    paymentStatus: VerificationPaymentStatus | null;
    error: string | null;
    lastFetched: number | null;
  };

  // Bundle purchase
  bundlePurchase: {
    status: 'idle' | 'loading' | 'purchasing' | 'validating' | 'succeeded' | 'failed';
    error: string | null;
  };

  // General billing state
  isInitialized: boolean;
  billingAvailable: boolean;
}

// Initial state
const initialState: BillingState = {
  verificationPayment: {
    status: 'idle',
    data: null,
    paymentStatus: null,
    error: null,
    lastFetched: null,
  },
  bundlePurchase: {
    status: 'idle',
    error: null,
  },
  isInitialized: false,
  billingAvailable: true,
};

// Async Thunks

/**
 * Create verification payment intent
 * Creates a $39 payment intent for verification
 */
export const createVerificationPaymentIntent = createAsyncThunk<
  VerificationPaymentData,
  { connectionRequestId?: string; idempotencyKey?: string } | undefined,
  { rejectValue: string }
>('billing/createVerificationPaymentIntent', async (params, { rejectWithValue }) => {
  try {
    return await paymentAPI.createVerificationPaymentIntent(params);
  } catch (error: any) {
    return rejectWithValue(error.userMessage || error.message || 'Failed to create payment');
  }
});

/**
 * Fetch verification payment status
 * Checks if user has already paid for verification
 */
export const fetchVerificationPaymentStatus = createAsyncThunk<
  VerificationPaymentStatus,
  void,
  { rejectValue: string }
>('billing/fetchVerificationPaymentStatus', async (_, { rejectWithValue }) => {
  try {
    return await paymentAPI.getVerificationPaymentStatus();
  } catch (error: any) {
    return rejectWithValue(error.userMessage || error.message || 'Failed to fetch payment status');
  }
});

/**
 * Validate in-app purchase receipt
 * Validates Google Play or App Store receipt with backend
 */
export const validateReceipt = createAsyncThunk<
  { valid: boolean; verificationPaymentId?: string },
  {
    productId: string;
    purchaseToken: string;
    transactionId: string;
    platform: 'android' | 'ios';
  },
  { rejectValue: string }
>('billing/validateReceipt', async (receipt, { rejectWithValue }) => {
  try {
    return await paymentAPI.validateReceipt(receipt);
  } catch (error: any) {
    return rejectWithValue(error.userMessage || error.message || 'Failed to validate receipt');
  }
});

// Slice
const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    // Initialize billing
    setBillingInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },

    setBillingAvailable(state, action: PayloadAction<boolean>) {
      state.billingAvailable = action.payload;
    },

    // Verification payment actions
    setVerificationPaymentStatus(
      state,
      action: PayloadAction<'idle' | 'loading' | 'creating' | 'processing' | 'succeeded' | 'failed'>
    ) {
      state.verificationPayment.status = action.payload;
    },

    setVerificationPaymentError(state, action: PayloadAction<string | null>) {
      state.verificationPayment.error = action.payload;
    },

    clearVerificationPaymentError(state) {
      state.verificationPayment.error = null;
    },

    // Mark payment as processing (after in-app purchase completes, before validation)
    markPaymentProcessing(state) {
      state.verificationPayment.status = 'processing';
      state.verificationPayment.error = null;
    },

    // Mark payment as succeeded (after backend validation)
    markPaymentSucceeded(state) {
      state.verificationPayment.status = 'succeeded';
      state.verificationPayment.error = null;
      if (state.verificationPayment.paymentStatus) {
        state.verificationPayment.paymentStatus.hasPaid = true;
        state.verificationPayment.paymentStatus.status = 'succeeded';
      }
    },

    // Bundle purchase actions
    setBundlePurchaseStatus(
      state,
      action: PayloadAction<'idle' | 'loading' | 'purchasing' | 'validating' | 'succeeded' | 'failed'>
    ) {
      state.bundlePurchase.status = action.payload;
    },

    setBundlePurchaseError(state, action: PayloadAction<string | null>) {
      state.bundlePurchase.error = action.payload;
    },

    clearBundlePurchaseError(state) {
      state.bundlePurchase.error = null;
    },

    // Reset state
    resetBillingState() {
      return initialState;
    },

    resetVerificationPaymentState(state) {
      state.verificationPayment = initialState.verificationPayment;
    },

    resetBundlePurchaseState(state) {
      state.bundlePurchase = initialState.bundlePurchase;
    },
  },
  extraReducers: (builder) => {
    // createVerificationPaymentIntent
    builder
      .addCase(createVerificationPaymentIntent.pending, (state) => {
        state.verificationPayment.status = 'creating';
        state.verificationPayment.error = null;
      })
      .addCase(createVerificationPaymentIntent.fulfilled, (state, action) => {
        state.verificationPayment.status = 'idle';
        state.verificationPayment.data = action.payload;
        state.verificationPayment.error = null;
      })
      .addCase(createVerificationPaymentIntent.rejected, (state, action) => {
        state.verificationPayment.status = 'failed';
        state.verificationPayment.error = action.payload || 'Failed to create payment intent';
      })

      // fetchVerificationPaymentStatus
      .addCase(fetchVerificationPaymentStatus.pending, (state) => {
        state.verificationPayment.status = 'loading';
        state.verificationPayment.error = null;
      })
      .addCase(fetchVerificationPaymentStatus.fulfilled, (state, action) => {
        state.verificationPayment.status = 'idle';
        state.verificationPayment.paymentStatus = action.payload;
        state.verificationPayment.lastFetched = Date.now();
        state.verificationPayment.error = null;
      })
      .addCase(fetchVerificationPaymentStatus.rejected, (state, action) => {
        state.verificationPayment.status = 'failed';
        state.verificationPayment.error = action.payload || 'Failed to fetch payment status';
      })

      // validateReceipt
      .addCase(validateReceipt.pending, (state) => {
        state.verificationPayment.status = 'processing';
        state.verificationPayment.error = null;
      })
      .addCase(validateReceipt.fulfilled, (state, action) => {
        if (action.payload.valid) {
          state.verificationPayment.status = 'succeeded';
          if (state.verificationPayment.paymentStatus) {
            state.verificationPayment.paymentStatus.hasPaid = true;
            state.verificationPayment.paymentStatus.status = 'succeeded';
          }
        } else {
          state.verificationPayment.status = 'failed';
          state.verificationPayment.error = 'Receipt validation failed';
        }
      })
      .addCase(validateReceipt.rejected, (state, action) => {
        state.verificationPayment.status = 'failed';
        state.verificationPayment.error = action.payload || 'Failed to validate receipt';
      });
  },
});

// Export actions
export const {
  setBillingInitialized,
  setBillingAvailable,
  setVerificationPaymentStatus,
  setVerificationPaymentError,
  clearVerificationPaymentError,
  markPaymentProcessing,
  markPaymentSucceeded,
  setBundlePurchaseStatus,
  setBundlePurchaseError,
  clearBundlePurchaseError,
  resetBillingState,
  resetVerificationPaymentState,
  resetBundlePurchaseState,
} = billingSlice.actions;

// Export reducer
export default billingSlice.reducer;

// Selectors
export const selectBillingState = (state: { billing: BillingState }) => state.billing;

export const selectVerificationPayment = (state: { billing: BillingState }) =>
  state.billing.verificationPayment;

export const selectVerificationPaymentStatus = (state: { billing: BillingState }) =>
  state.billing.verificationPayment.paymentStatus;

export const selectVerificationPaymentLoading = (state: { billing: BillingState }) =>
  state.billing.verificationPayment.status === 'loading' ||
  state.billing.verificationPayment.status === 'creating' ||
  state.billing.verificationPayment.status === 'processing';

export const selectVerificationPaymentError = (state: { billing: BillingState }) =>
  state.billing.verificationPayment.error;

export const selectHasPaidForVerification = (state: { billing: BillingState }) =>
  state.billing.verificationPayment.paymentStatus?.hasPaid ?? false;

export const selectBundlePurchase = (state: { billing: BillingState }) =>
  state.billing.bundlePurchase;

export const selectBundlePurchaseLoading = (state: { billing: BillingState }) =>
  state.billing.bundlePurchase.status === 'loading' ||
  state.billing.bundlePurchase.status === 'purchasing' ||
  state.billing.bundlePurchase.status === 'validating';

export const selectIsBillingAvailable = (state: { billing: BillingState }) =>
  state.billing.billingAvailable;
