/**
 * TypeScript Types for Verification Module
 * Based on data-model.md and contracts/openapi.yaml
 */

import { StackNavigationProp } from '@react-navigation/stack';

// ============================================
// API Response Types (from OpenAPI contract)
// ============================================

export interface VerificationStatusResponse {
  email_verified: boolean;
  phone_verified: boolean;
  id_verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  background_check_status:
    | 'not_started'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'consider'
    | 'expired';
  income_verification_status: 'pending' | 'verified' | 'rejected';
  verification_score: number;
  fully_verified: boolean;
  // Expiration dates for time-limited verifications
  id_expiration_date?: string;
  bg_check_expiration_date?: string;
}

export interface PhoneSendResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

export interface PhoneVerifyRequest {
  code: string;
}

export interface PhoneVerifyResponse {
  success: boolean;
  message?: string;
}

export interface EmailSendResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

export interface IDVerificationInitiateResponse {
  verificationUrl: string;
  sessionId: string;
}

export interface IDVerificationCompleteResponse {
  success: boolean;
  status: 'approved' | 'rejected' | 'pending';
}

export interface BackgroundCheckInitiateRequest {
  consentTimestamp: string;
  signatureData: string;
}

export interface BackgroundCheckInitiateResponse {
  success: boolean;
  estimatedCompletion: string;
  applicationId?: string;
}

export interface IncomeVerificationDocument {
  filename: string;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/heic';
  data: string;
}

export interface IncomeVerificationRequest {
  documentType: 'pay_stubs' | 'employment_letter';
  documents: IncomeVerificationDocument[];
}

export interface IncomeVerificationResponse {
  success: boolean;
  message?: string;
}

export interface VerificationError {
  error: string;
  message: string;
}

// ============================================
// Redux State Types (from data-model.md)
// ============================================

export interface UploadedDocument {
  id: string;
  uri: string;
  name: string;
  size: number;
  type: 'image/jpeg' | 'image/png' | 'image/heic' | 'application/pdf';
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export interface VerificationState {
  // API Status
  status: VerificationStatusResponse | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // ID Verification
  idVerification: {
    sessionUrl: string | null;
    sessionId: string | null;
    webViewVisible: boolean;
    retryCount: number;
    cooldownUntil: number | null;
  };

  // Background Check
  backgroundCheck: {
    consentGiven: boolean;
    signatureData: string | null;
    processing: boolean;
    estimatedCompletion: string | null;
  };

  // Phone Verification
  phoneVerification: {
    codeSent: boolean;
    phoneNumber: string | null;
    codeExpiry: number | null;
    resendAvailableAt: number | null;
    failedAttempts: number;
    cooldownUntil: number | null;
  };

  // Email Verification
  emailVerification: {
    linkSent: boolean;
    email: string | null;
    linkExpiry: number | null;
  };

  // Income Verification
  incomeVerification: {
    documentType: 'pay_stubs' | 'employment_letter' | null;
    documents: UploadedDocument[];
    uploading: boolean;
    uploadProgress: number;
  };
}

// ============================================
// Navigation Types
// ============================================

export type VerificationStackParamList = {
  Dashboard: undefined;
  IDVerification: undefined;
  BackgroundCheck: undefined;
  PhoneVerification: {
    phoneNumber?: string;
  };
  EmailVerification: {
    email: string;
  };
  IncomeVerification: undefined;
};

// ============================================
// Screen Props Types
// ============================================

export interface VerificationDashboardProps {
  navigation: StackNavigationProp<VerificationStackParamList, 'Dashboard'>;
}

export interface IDVerificationProps {
  navigation: StackNavigationProp<VerificationStackParamList, 'IDVerification'>;
}

export interface BackgroundCheckProps {
  navigation: StackNavigationProp<VerificationStackParamList, 'BackgroundCheck'>;
}

export interface PhoneVerificationProps {
  navigation: StackNavigationProp<VerificationStackParamList, 'PhoneVerification'>;
  route: {
    params?: {
      phoneNumber?: string;
    };
  };
}

export interface EmailVerificationProps {
  navigation: StackNavigationProp<VerificationStackParamList, 'EmailVerification'>;
  route: {
    params: {
      email: string;
    };
  };
}

export interface IncomeVerificationProps {
  navigation: StackNavigationProp<VerificationStackParamList, 'IncomeVerification'>;
}

// ============================================
// Component Props Types
// ============================================

export type VerificationItemStatus = 'not_started' | 'pending' | 'completed' | 'failed' | 'expired';

export interface VerificationItem {
  id: 'email' | 'phone' | 'id' | 'background' | 'income';
  title: string;
  description: string;
  status: VerificationItemStatus;
  required: boolean;
  icon: string;
  expiresAt?: Date;
}

export interface VerificationCardProps {
  item: VerificationItem;
  onPress: () => void;
  testID?: string;
}

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  testID?: string;
}

export interface OTPInputState {
  digits: [string, string, string, string, string, string];
  focusedIndex: number;
  autoSubmitting: boolean;
}

export interface SignaturePadProps {
  onSignature: (signatureData: string) => void;
  onClear?: () => void;
  strokeColor?: string;
  strokeWidth?: number;
  testID?: string;
}

export interface DocumentUploaderProps {
  documentType: 'pay_stubs' | 'employment_letter';
  documents: UploadedDocument[];
  onAddDocument: (document: UploadedDocument) => void;
  onRemoveDocument: (documentId: string) => void;
  maxDocuments: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  testID?: string;
}

export interface VerificationProgressProps {
  completedCount: number;
  totalCount: number;
  requiredCount: number;
  completedRequired: number;
  testID?: string;
}

// ============================================
// Screen State Types
// ============================================

export interface VeriffWebViewState {
  url: string;
  loading: boolean;
  error: string | null;
  canGoBack: boolean;
}

export interface ConsentCheckItem {
  id: string;
  text: string;
  checked: boolean;
  required: boolean;
}

export interface BackgroundCheckState {
  step: 'disclosure' | 'consent' | 'signature' | 'submitted';
  consentItems: ConsentCheckItem[];
  allConsentsGiven: boolean;
}

export interface DocumentUploadState {
  selectedType: 'pay_stubs' | 'employment_letter' | null;
  documents: UploadedDocument[];
  maxDocuments: number;
}

// ============================================
// Constants
// ============================================

export const VERIFICATION_CONSTANTS = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  MAX_OTP_ATTEMPTS: 3,
  COOLDOWN_MINUTES: 5,
  MAX_ID_RETRIES: 3,
  ID_COOLDOWN_HOURS: 24,
  MAX_DOCUMENT_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  PAY_STUBS_COUNT: 2,
  EMPLOYMENT_LETTER_COUNT: 1,
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'] as const,
} as const;

// ============================================
// Error Codes
// ============================================

export const VERIFICATION_ERROR_CODES = {
  VERIFICATION_NOT_FOUND: 'Please complete registration first',
  PHONE_ALREADY_VERIFIED: 'This phone number is already in use',
  INVALID_OTP: 'Invalid code. Please try again',
  OTP_EXPIRED: 'Code expired. Please request a new one',
  MAX_RETRIES_EXCEEDED: 'Too many attempts. Please wait 5 minutes',
  ID_VERIFICATION_FAILED: 'Verification failed. Please retry',
  DOCUMENT_TOO_LARGE: 'File too large. Maximum size is 5MB',
  INVALID_DOCUMENT_TYPE: 'Please upload PDF, JPG, PNG, or HEIC',
  BACKGROUND_CHECK_REJECTED: 'Verification not approved',
} as const;
