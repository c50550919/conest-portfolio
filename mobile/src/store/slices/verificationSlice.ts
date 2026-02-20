/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Verification Redux Slice
 * Task: T018
 *
 * Manages all verification state including:
 * - Phone verification (OTP)
 * - Email verification (magic link)
 * - ID verification (Veriff WebView)
 * - Background check (Certn)
 * - Income verification (document upload)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { verificationAPI } from '../../services/api/verificationAPI';
import {
  VerificationState,
  VerificationStatusResponse,
  PhoneSendResponse,
  PhoneVerifyResponse,
  EmailSendResponse,
  IDVerificationInitiateResponse,
  IDVerificationCompleteResponse,
  BackgroundCheckInitiateRequest,
  BackgroundCheckInitiateResponse,
  IncomeVerificationRequest,
  IncomeVerificationResponse,
  UploadedDocument,
  VERIFICATION_CONSTANTS,
} from '../../types/verification';

// Initial state
const initialState: VerificationState = {
  status: null,
  loading: false,
  error: null,
  lastFetched: null,

  idVerification: {
    sessionUrl: null,
    sessionId: null,
    webViewVisible: false,
    retryCount: 0,
    cooldownUntil: null,
  },

  backgroundCheck: {
    consentGiven: false,
    signatureData: null,
    processing: false,
    estimatedCompletion: null,
  },

  phoneVerification: {
    codeSent: false,
    phoneNumber: null,
    codeExpiry: null,
    resendAvailableAt: null,
    failedAttempts: 0,
    cooldownUntil: null,
  },

  emailVerification: {
    linkSent: false,
    email: null,
    linkExpiry: null,
  },

  incomeVerification: {
    documentType: null,
    documents: [],
    uploading: false,
    uploadProgress: 0,
  },
};

// Async Thunks

/**
 * Fetch verification status from API
 */
export const fetchVerificationStatus = createAsyncThunk<
  VerificationStatusResponse,
  void,
  { rejectValue: string }
>('verification/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    return await verificationAPI.getVerificationStatus();
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Send phone verification code
 */
export const sendPhoneCode = createAsyncThunk<PhoneSendResponse, void, { rejectValue: string }>(
  'verification/sendPhoneCode',
  async (_, { rejectWithValue }) => {
    try {
      return await verificationAPI.sendPhoneCode();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Send phone verification via voice call (fallback)
 */
export const sendPhoneVoiceCode = createAsyncThunk<PhoneSendResponse, void, { rejectValue: string }>(
  'verification/sendPhoneVoiceCode',
  async (_, { rejectWithValue }) => {
    try {
      return await verificationAPI.sendPhoneVoiceCode();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Verify phone with OTP code
 */
export const verifyPhoneCode = createAsyncThunk<
  PhoneVerifyResponse,
  string,
  { rejectValue: string }
>('verification/verifyPhoneCode', async (code, { rejectWithValue }) => {
  try {
    return await verificationAPI.verifyPhoneCode(code);
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Send email verification link
 */
export const sendEmailLink = createAsyncThunk<EmailSendResponse, void, { rejectValue: string }>(
  'verification/sendEmailLink',
  async (_, { rejectWithValue }) => {
    try {
      return await verificationAPI.sendEmailLink();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Initiate ID verification (get Veriff URL)
 */
export const initiateIDVerification = createAsyncThunk<
  IDVerificationInitiateResponse,
  void,
  { rejectValue: string }
>('verification/initiateIDVerification', async (_, { rejectWithValue }) => {
  try {
    return await verificationAPI.initiateIDVerification();
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Complete ID verification after WebView
 */
export const completeIDVerification = createAsyncThunk<
  IDVerificationCompleteResponse,
  string,
  { rejectValue: string }
>('verification/completeIDVerification', async (sessionId, { rejectWithValue }) => {
  try {
    return await verificationAPI.completeIDVerification(sessionId);
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Initiate background check with consent
 */
export const initiateBackgroundCheck = createAsyncThunk<
  BackgroundCheckInitiateResponse,
  BackgroundCheckInitiateRequest,
  { rejectValue: string }
>('verification/initiateBackgroundCheck', async (request, { rejectWithValue }) => {
  try {
    return await verificationAPI.initiateBackgroundCheck(request);
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Upload income verification documents
 */
export const uploadIncomeDocuments = createAsyncThunk<
  IncomeVerificationResponse,
  IncomeVerificationRequest,
  { rejectValue: string }
>('verification/uploadIncomeDocuments', async (request, { rejectWithValue }) => {
  try {
    return await verificationAPI.uploadIncomeDocuments(request);
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

// Slice
const verificationSlice = createSlice({
  name: 'verification',
  initialState,
  reducers: {
    // Phone verification actions
    resetPhoneVerification(state) {
      state.phoneVerification = {
        codeSent: false,
        phoneNumber: state.phoneVerification.phoneNumber,
        codeExpiry: null,
        resendAvailableAt: null,
        failedAttempts: 0,
        cooldownUntil: null,
      };
    },

    setPhoneNumber(state, action: PayloadAction<string>) {
      state.phoneVerification.phoneNumber = action.payload;
    },

    // Email verification actions
    resetEmailVerification(state) {
      state.emailVerification = {
        linkSent: false,
        email: state.emailVerification.email,
        linkExpiry: null,
      };
    },

    setEmail(state, action: PayloadAction<string>) {
      state.emailVerification.email = action.payload;
    },

    // ID verification actions
    setWebViewVisible(state, action: PayloadAction<boolean>) {
      state.idVerification.webViewVisible = action.payload;
    },

    resetIDVerification(state) {
      state.idVerification = {
        sessionUrl: null,
        sessionId: null,
        webViewVisible: false,
        retryCount: state.idVerification.retryCount,
        cooldownUntil: state.idVerification.cooldownUntil,
      };
    },

    // Background check actions
    setConsentGiven(state, action: PayloadAction<boolean>) {
      state.backgroundCheck.consentGiven = action.payload;
    },

    setSignatureData(state, action: PayloadAction<string | null>) {
      state.backgroundCheck.signatureData = action.payload;
    },

    // Income verification actions
    setDocumentType(state, action: PayloadAction<'pay_stubs' | 'employment_letter' | null>) {
      state.incomeVerification.documentType = action.payload;
      // Reset documents when type changes
      state.incomeVerification.documents = [];
    },

    addDocument(state, action: PayloadAction<UploadedDocument>) {
      const maxDocs =
        state.incomeVerification.documentType === 'pay_stubs'
          ? VERIFICATION_CONSTANTS.PAY_STUBS_COUNT
          : VERIFICATION_CONSTANTS.EMPLOYMENT_LETTER_COUNT;

      if (state.incomeVerification.documents.length < maxDocs) {
        state.incomeVerification.documents.push(action.payload);
      }
    },

    removeDocument(state, action: PayloadAction<string>) {
      state.incomeVerification.documents = state.incomeVerification.documents.filter(
        (doc) => doc.id !== action.payload
      );
    },

    updateDocumentStatus(
      state,
      action: PayloadAction<{ id: string; status: UploadedDocument['uploadStatus'] }>
    ) {
      const doc = state.incomeVerification.documents.find((d) => d.id === action.payload.id);
      if (doc) {
        doc.uploadStatus = action.payload.status;
      }
    },

    setUploadProgress(state, action: PayloadAction<number>) {
      state.incomeVerification.uploadProgress = action.payload;
    },

    // General actions
    clearError(state) {
      state.error = null;
    },

    resetVerificationState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // fetchVerificationStatus
    builder
      .addCase(fetchVerificationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVerificationStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchVerificationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch verification status';
      })

      // sendPhoneCode
      .addCase(sendPhoneCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendPhoneCode.fulfilled, (state, action) => {
        state.loading = false;
        state.phoneVerification.codeSent = true;
        state.phoneVerification.codeExpiry = action.payload.expiresAt
          ? new Date(action.payload.expiresAt).getTime()
          : Date.now() + VERIFICATION_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000;
        state.phoneVerification.resendAvailableAt = Date.now() + 60 * 1000; // 60s cooldown for resend
      })
      .addCase(sendPhoneCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send verification code';
        if (action.payload === 'RATE_LIMITED') {
          state.phoneVerification.cooldownUntil =
            Date.now() + VERIFICATION_CONSTANTS.COOLDOWN_MINUTES * 60 * 1000;
        }
      })

      // sendPhoneVoiceCode (voice call fallback)
      .addCase(sendPhoneVoiceCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendPhoneVoiceCode.fulfilled, (state, action) => {
        state.loading = false;
        state.phoneVerification.codeSent = true;
        state.phoneVerification.codeExpiry = action.payload.expiresAt
          ? new Date(action.payload.expiresAt).getTime()
          : Date.now() + VERIFICATION_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000;
        state.phoneVerification.resendAvailableAt = Date.now() + 60 * 1000;
      })
      .addCase(sendPhoneVoiceCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to initiate voice verification';
        if (action.payload === 'RATE_LIMITED') {
          state.phoneVerification.cooldownUntil =
            Date.now() + VERIFICATION_CONSTANTS.COOLDOWN_MINUTES * 60 * 1000;
        }
      })

      // verifyPhoneCode
      .addCase(verifyPhoneCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPhoneCode.fulfilled, (state) => {
        state.loading = false;
        state.phoneVerification.codeSent = false;
        state.phoneVerification.failedAttempts = 0;
        // Status will be updated via fetchVerificationStatus
      })
      .addCase(verifyPhoneCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to verify code';
        state.phoneVerification.failedAttempts += 1;

        if (
          state.phoneVerification.failedAttempts >= VERIFICATION_CONSTANTS.MAX_OTP_ATTEMPTS ||
          action.payload === 'MAX_RETRIES_EXCEEDED'
        ) {
          state.phoneVerification.cooldownUntil =
            Date.now() + VERIFICATION_CONSTANTS.COOLDOWN_MINUTES * 60 * 1000;
          state.phoneVerification.failedAttempts = 0;
        }
      })

      // sendEmailLink
      .addCase(sendEmailLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendEmailLink.fulfilled, (state, action) => {
        state.loading = false;
        state.emailVerification.linkSent = true;
        state.emailVerification.linkExpiry = action.payload.expiresAt
          ? new Date(action.payload.expiresAt).getTime()
          : Date.now() + 24 * 60 * 60 * 1000; // 24h default
      })
      .addCase(sendEmailLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send verification link';
      })

      // initiateIDVerification
      .addCase(initiateIDVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateIDVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.idVerification.sessionUrl = action.payload.verificationUrl;
        state.idVerification.sessionId = action.payload.sessionId;
        state.idVerification.webViewVisible = true;
      })
      .addCase(initiateIDVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to initiate ID verification';
        state.idVerification.retryCount += 1;

        if (state.idVerification.retryCount >= VERIFICATION_CONSTANTS.MAX_ID_RETRIES) {
          state.idVerification.cooldownUntil =
            Date.now() + VERIFICATION_CONSTANTS.ID_COOLDOWN_HOURS * 60 * 60 * 1000;
        }
      })

      // completeIDVerification
      .addCase(completeIDVerification.pending, (state) => {
        state.loading = true;
      })
      .addCase(completeIDVerification.fulfilled, (state) => {
        state.loading = false;
        state.idVerification.webViewVisible = false;
        state.idVerification.sessionUrl = null;
        state.idVerification.sessionId = null;
        // Status will be updated via fetchVerificationStatus
      })
      .addCase(completeIDVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to complete ID verification';
        state.idVerification.webViewVisible = false;
      })

      // initiateBackgroundCheck
      .addCase(initiateBackgroundCheck.pending, (state) => {
        state.backgroundCheck.processing = true;
        state.error = null;
      })
      .addCase(initiateBackgroundCheck.fulfilled, (state, action) => {
        state.backgroundCheck.processing = false;
        state.backgroundCheck.estimatedCompletion = action.payload.estimatedCompletion;
        // Clear sensitive data after submission
        state.backgroundCheck.signatureData = null;
      })
      .addCase(initiateBackgroundCheck.rejected, (state, action) => {
        state.backgroundCheck.processing = false;
        state.error = action.payload || 'Failed to initiate background check';
      })

      // uploadIncomeDocuments
      .addCase(uploadIncomeDocuments.pending, (state) => {
        state.incomeVerification.uploading = true;
        state.incomeVerification.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadIncomeDocuments.fulfilled, (state) => {
        state.incomeVerification.uploading = false;
        state.incomeVerification.uploadProgress = 100;
        // Clear documents after successful upload
        state.incomeVerification.documents = [];
        state.incomeVerification.documentType = null;
      })
      .addCase(uploadIncomeDocuments.rejected, (state, action) => {
        state.incomeVerification.uploading = false;
        state.incomeVerification.uploadProgress = 0;
        state.error = action.payload || 'Failed to upload documents';
      });
  },
});

// Export actions
export const {
  resetPhoneVerification,
  setPhoneNumber,
  resetEmailVerification,
  setEmail,
  setWebViewVisible,
  resetIDVerification,
  setConsentGiven,
  setSignatureData,
  setDocumentType,
  addDocument,
  removeDocument,
  updateDocumentStatus,
  setUploadProgress,
  clearError,
  resetVerificationState,
} = verificationSlice.actions;

// Export reducer
export default verificationSlice.reducer;

// Selectors
export const selectVerificationStatus = (state: { verification: VerificationState }) =>
  state.verification.status;

export const selectVerificationLoading = (state: { verification: VerificationState }) =>
  state.verification.loading;

export const selectVerificationError = (state: { verification: VerificationState }) =>
  state.verification.error;

export const selectPhoneVerification = (state: { verification: VerificationState }) =>
  state.verification.phoneVerification;

export const selectEmailVerification = (state: { verification: VerificationState }) =>
  state.verification.emailVerification;

export const selectIDVerification = (state: { verification: VerificationState }) =>
  state.verification.idVerification;

export const selectBackgroundCheck = (state: { verification: VerificationState }) =>
  state.verification.backgroundCheck;

export const selectIncomeVerification = (state: { verification: VerificationState }) =>
  state.verification.incomeVerification;

export const selectVerificationScore = (state: { verification: VerificationState }) =>
  state.verification.status?.verification_score ?? 0;

export const selectIsFullyVerified = (state: { verification: VerificationState }) =>
  state.verification.status?.fully_verified ?? false;
