/**
 * Household Safety Disclosure Redux Slice
 *
 * Manages state for the mandatory parental disclosure system.
 * Parents must complete this attestation before participating in matching.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import householdSafetyAPI, {
  AttestationQuestion,
  AttestationResponse,
  HouseholdSafetyDisclosure,
  SubmitAttestationRequest,
} from '../../services/api/householdSafetyAPI';

// ============================================================================
// Types
// ============================================================================

interface DisclosureStatus {
  hasValidDisclosure: boolean;
  disclosure: HouseholdSafetyDisclosure | null;
  expiresIn: number | null;
  needsRenewal: boolean;
  canParticipateInMatching: boolean;
}

interface HouseholdSafetyState {
  // Questions and responses
  questions: AttestationQuestion[];
  responses: Record<string, boolean>;
  signatureData: string | null;

  // Current disclosure status
  status: DisclosureStatus | null;

  // Loading states
  loading: boolean;
  submitting: boolean;

  // Error handling
  error: string | null;

  // Metadata
  lastFetched: number | null;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: HouseholdSafetyState = {
  questions: [],
  responses: {},
  signatureData: null,
  status: null,
  loading: false,
  submitting: false,
  error: null,
  lastFetched: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetch attestation questions
 */
export const fetchQuestions = createAsyncThunk<
  AttestationQuestion[],
  void,
  { rejectValue: string }
>('householdSafety/fetchQuestions', async (_, { rejectWithValue }) => {
  try {
    const response = await householdSafetyAPI.getQuestions();
    return response.data.questions;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Fetch current disclosure status
 */
export const fetchDisclosureStatus = createAsyncThunk<
  DisclosureStatus,
  void,
  { rejectValue: string }
>('householdSafety/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await householdSafetyAPI.getStatus();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

/**
 * Submit signed attestation
 */
export const submitAttestation = createAsyncThunk<
  HouseholdSafetyDisclosure,
  SubmitAttestationRequest,
  { rejectValue: string }
>('householdSafety/submit', async (request, { rejectWithValue }) => {
  try {
    const response = await householdSafetyAPI.submitAttestation(request);
    return response.data.disclosure;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

// ============================================================================
// Slice
// ============================================================================

const householdSafetySlice = createSlice({
  name: 'householdSafety',
  initialState,
  reducers: {
    /**
     * Set response for a specific question
     */
    setResponse: (
      state,
      action: PayloadAction<{ questionId: string; response: boolean }>
    ) => {
      state.responses[action.payload.questionId] = action.payload.response;
    },

    /**
     * Set signature data (base64 encoded image)
     */
    setSignatureData: (state, action: PayloadAction<string>) => {
      state.signatureData = action.payload;
    },

    /**
     * Clear signature data
     */
    clearSignature: (state) => {
      state.signatureData = null;
    },

    /**
     * Clear any error
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Reset the entire form
     */
    resetForm: (state) => {
      state.responses = {};
      state.signatureData = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Questions
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.loading = false;
        state.questions = action.payload;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load questions';
      });

    // Fetch Status
    builder
      .addCase(fetchDisclosureStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDisclosureStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchDisclosureStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load disclosure status';
      });

    // Submit Attestation
    builder
      .addCase(submitAttestation.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitAttestation.fulfilled, (state, action) => {
        state.submitting = false;
        // Update status to reflect successful submission
        state.status = {
          hasValidDisclosure: true,
          disclosure: action.payload,
          expiresIn: 365,
          needsRenewal: false,
          canParticipateInMatching: true,
        };
        // Clear form after successful submission
        state.responses = {};
        state.signatureData = null;
      })
      .addCase(submitAttestation.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Submission failed';
      });
  },
});

// ============================================================================
// Selectors
// ============================================================================

export const selectQuestions = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.questions;

export const selectResponses = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.responses;

export const selectSignatureData = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.signatureData;

export const selectDisclosureStatus = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.status;

export const selectLoading = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.loading;

export const selectSubmitting = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.submitting;

export const selectError = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.error;

export const selectHasValidDisclosure = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.status?.hasValidDisclosure ?? false;

export const selectCanParticipateInMatching = (state: { householdSafety: HouseholdSafetyState }) =>
  state.householdSafety.status?.canParticipateInMatching ?? false;

/**
 * Check if all required questions have been answered correctly
 */
export const selectAllQuestionsAnswered = (state: { householdSafety: HouseholdSafetyState }) => {
  const { questions, responses } = state.householdSafety;

  if (questions.length === 0) {
    return false;
  }

  return questions.every((q) => {
    if (!q.required) return true;
    const answer = responses[q.id];
    return answer !== undefined && answer === q.expectedAnswer;
  });
};

/**
 * Check if form is ready to submit (all questions answered + signature)
 */
export const selectReadyToSubmit = (state: { householdSafety: HouseholdSafetyState }) => {
  const allAnswered = selectAllQuestionsAnswered(state);
  const hasSignature = !!state.householdSafety.signatureData;
  return allAnswered && hasSignature;
};

// ============================================================================
// Exports
// ============================================================================

export const {
  setResponse,
  setSignatureData,
  clearSignature,
  clearError,
  resetForm,
} = householdSafetySlice.actions;

export default householdSafetySlice.reducer;
