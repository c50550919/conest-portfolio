/**
 * Unit Tests for Verification Redux Slice
 * TDD: These tests MUST FAIL before implementation
 * Task: T012
 */

import { configureStore } from '@reduxjs/toolkit';
import verificationReducer, {
  fetchVerificationStatus,
  sendPhoneCode,
  verifyPhoneCode,
  sendEmailLink,
  initiateIDVerification,
  completeIDVerification,
  initiateBackgroundCheck,
  uploadIncomeDocuments,
  resetPhoneVerification,
  resetEmailVerification,
  setConsentGiven,
  setSignatureData,
  addDocument,
  removeDocument,
  setDocumentType,
  clearError,
} from '../../src/store/slices/verificationSlice';
import { VerificationState, VerificationStatusResponse } from '../../src/types/verification';

// Mock the API
jest.mock('../../src/services/api/verificationAPI', () => ({
  verificationAPI: {
    getVerificationStatus: jest.fn(),
    sendPhoneCode: jest.fn(),
    verifyPhoneCode: jest.fn(),
    sendEmailLink: jest.fn(),
    initiateIDVerification: jest.fn(),
    completeIDVerification: jest.fn(),
    initiateBackgroundCheck: jest.fn(),
    uploadIncomeDocuments: jest.fn(),
  },
}));

describe('verificationSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        verification: verificationReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().verification as VerificationState;

      expect(state.status).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetched).toBeNull();

      // ID Verification
      expect(state.idVerification.sessionUrl).toBeNull();
      expect(state.idVerification.sessionId).toBeNull();
      expect(state.idVerification.webViewVisible).toBe(false);
      expect(state.idVerification.retryCount).toBe(0);

      // Background Check
      expect(state.backgroundCheck.consentGiven).toBe(false);
      expect(state.backgroundCheck.signatureData).toBeNull();
      expect(state.backgroundCheck.processing).toBe(false);

      // Phone Verification
      expect(state.phoneVerification.codeSent).toBe(false);
      expect(state.phoneVerification.failedAttempts).toBe(0);

      // Email Verification
      expect(state.emailVerification.linkSent).toBe(false);

      // Income Verification
      expect(state.incomeVerification.documents).toEqual([]);
      expect(state.incomeVerification.uploading).toBe(false);
    });
  });

  describe('fetchVerificationStatus', () => {
    const mockStatus: VerificationStatusResponse = {
      email_verified: true,
      phone_verified: false,
      id_verification_status: 'pending',
      background_check_status: 'not_started',
      income_verification_status: 'pending',
      verification_score: 15,
      fully_verified: false,
    };

    it('should set loading to true when pending', () => {
      store.dispatch(fetchVerificationStatus.pending('', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update status when fulfilled', () => {
      store.dispatch(fetchVerificationStatus.fulfilled(mockStatus, '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.loading).toBe(false);
      expect(state.status).toEqual(mockStatus);
      expect(state.lastFetched).toBeDefined();
    });

    it('should set error when rejected', () => {
      // Dispatch with rejectWithValue payload (as the slice expects action.payload)
      store.dispatch(fetchVerificationStatus.rejected(null, '', undefined, 'Network error'));

      const state = store.getState().verification as VerificationState;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should set default error when rejected without payload', () => {
      store.dispatch(fetchVerificationStatus.rejected(new Error('test'), '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch verification status');
    });
  });

  describe('sendPhoneCode', () => {
    it('should set codeSent to true when fulfilled', () => {
      const response = {
        success: true,
        message: 'Code sent',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };

      store.dispatch(sendPhoneCode.fulfilled(response, '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.phoneVerification.codeSent).toBe(true);
      expect(state.phoneVerification.codeExpiry).toBeDefined();
    });

    it('should set cooldown when rate limited', () => {
      const error = { message: 'RATE_LIMITED' };
      store.dispatch(sendPhoneCode.rejected(error as any, '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.phoneVerification.cooldownUntil).toBeDefined();
    });
  });

  describe('verifyPhoneCode', () => {
    it('should update phone_verified status when fulfilled', () => {
      store.dispatch(verifyPhoneCode.fulfilled({ success: true }, '', '123456'));

      const state = store.getState().verification as VerificationState;
      expect(state.phoneVerification.codeSent).toBe(false); // Reset after success
    });

    it('should increment failedAttempts on invalid code', () => {
      const error = { message: 'INVALID_OTP' };
      store.dispatch(verifyPhoneCode.rejected(error as any, '', '000000'));

      const state = store.getState().verification as VerificationState;
      expect(state.phoneVerification.failedAttempts).toBeGreaterThan(0);
    });

    it('should set cooldown after max retries', () => {
      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        store.dispatch(verifyPhoneCode.rejected({ message: 'INVALID_OTP' } as any, '', '000000'));
      }

      const state = store.getState().verification as VerificationState;
      expect(state.phoneVerification.cooldownUntil).toBeDefined();
    });
  });

  describe('sendEmailLink', () => {
    it('should set linkSent to true when fulfilled', () => {
      const response = {
        success: true,
        message: 'Link sent',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      store.dispatch(sendEmailLink.fulfilled(response, '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.emailVerification.linkSent).toBe(true);
      expect(state.emailVerification.linkExpiry).toBeDefined();
    });
  });

  describe('initiateIDVerification', () => {
    it('should set session URL and ID when fulfilled', () => {
      const response = {
        verificationUrl: 'https://veriff.com/session/123',
        sessionId: 'session-123',
      };

      store.dispatch(initiateIDVerification.fulfilled(response, '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.idVerification.sessionUrl).toBe(response.verificationUrl);
      expect(state.idVerification.sessionId).toBe(response.sessionId);
      expect(state.idVerification.webViewVisible).toBe(true);
    });

    it('should increment retry count on rejection', () => {
      store.dispatch(initiateIDVerification.rejected({ message: 'Error' } as any, '', undefined));

      const state = store.getState().verification as VerificationState;
      expect(state.idVerification.retryCount).toBe(1);
    });
  });

  describe('completeIDVerification', () => {
    it('should hide webview and update status when fulfilled', () => {
      store.dispatch(
        completeIDVerification.fulfilled({ success: true, status: 'approved' }, '', 'session-123'),
      );

      const state = store.getState().verification as VerificationState;
      expect(state.idVerification.webViewVisible).toBe(false);
    });
  });

  describe('initiateBackgroundCheck', () => {
    const request = {
      consentTimestamp: new Date().toISOString(),
      signatureData: 'base64-signature',
    };

    it('should set processing to true when pending', () => {
      store.dispatch(initiateBackgroundCheck.pending('', request));

      const state = store.getState().verification as VerificationState;
      expect(state.backgroundCheck.processing).toBe(true);
    });

    it('should set estimatedCompletion when fulfilled', () => {
      const response = {
        success: true,
        estimatedCompletion: '24 hours',
        applicationId: 'app-123',
      };

      store.dispatch(initiateBackgroundCheck.fulfilled(response, '', request));

      const state = store.getState().verification as VerificationState;
      expect(state.backgroundCheck.processing).toBe(false);
      expect(state.backgroundCheck.estimatedCompletion).toBe('24 hours');
    });
  });

  describe('uploadIncomeDocuments', () => {
    const request = {
      documentType: 'pay_stubs' as const,
      documents: [{ filename: 'doc.pdf', contentType: 'application/pdf' as const, data: 'base64' }],
    };

    it('should set uploading to true when pending', () => {
      store.dispatch(uploadIncomeDocuments.pending('', request));

      const state = store.getState().verification as VerificationState;
      expect(state.incomeVerification.uploading).toBe(true);
    });

    it('should clear documents when fulfilled', () => {
      store.dispatch(uploadIncomeDocuments.fulfilled({ success: true }, '', request));

      const state = store.getState().verification as VerificationState;
      expect(state.incomeVerification.uploading).toBe(false);
    });
  });

  describe('synchronous actions', () => {
    it('should reset phone verification state', () => {
      // First set some state
      store.dispatch(sendPhoneCode.fulfilled({ success: true, message: 'sent' }, '', undefined));

      // Then reset
      store.dispatch(resetPhoneVerification());

      const state = store.getState().verification as VerificationState;
      expect(state.phoneVerification.codeSent).toBe(false);
      expect(state.phoneVerification.failedAttempts).toBe(0);
    });

    it('should reset email verification state', () => {
      store.dispatch(sendEmailLink.fulfilled({ success: true, message: 'sent' }, '', undefined));
      store.dispatch(resetEmailVerification());

      const state = store.getState().verification as VerificationState;
      expect(state.emailVerification.linkSent).toBe(false);
    });

    it('should set consent given', () => {
      store.dispatch(setConsentGiven(true));

      const state = store.getState().verification as VerificationState;
      expect(state.backgroundCheck.consentGiven).toBe(true);
    });

    it('should set signature data', () => {
      store.dispatch(setSignatureData('base64-signature'));

      const state = store.getState().verification as VerificationState;
      expect(state.backgroundCheck.signatureData).toBe('base64-signature');
    });

    it('should add document', () => {
      const document = {
        id: 'doc-1',
        uri: 'file://path/to/doc.pdf',
        name: 'doc.pdf',
        size: 1024,
        type: 'application/pdf' as const,
        uploadStatus: 'pending' as const,
      };

      store.dispatch(addDocument(document));

      const state = store.getState().verification as VerificationState;
      expect(state.incomeVerification.documents).toHaveLength(1);
      expect(state.incomeVerification.documents[0].id).toBe('doc-1');
    });

    it('should remove document', () => {
      const document = {
        id: 'doc-1',
        uri: 'file://path/to/doc.pdf',
        name: 'doc.pdf',
        size: 1024,
        type: 'application/pdf' as const,
        uploadStatus: 'pending' as const,
      };

      store.dispatch(addDocument(document));
      store.dispatch(removeDocument('doc-1'));

      const state = store.getState().verification as VerificationState;
      expect(state.incomeVerification.documents).toHaveLength(0);
    });

    it('should set document type', () => {
      store.dispatch(setDocumentType('employment_letter'));

      const state = store.getState().verification as VerificationState;
      expect(state.incomeVerification.documentType).toBe('employment_letter');
    });

    it('should clear error', () => {
      store.dispatch(fetchVerificationStatus.rejected(new Error('Test error'), '', undefined));
      store.dispatch(clearError());

      const state = store.getState().verification as VerificationState;
      expect(state.error).toBeNull();
    });
  });
});
