/**
 * Connection Requests Redux Slice
 *
 * Purpose: State management for connection request feature (send/accept/decline requests)
 * Feature: 003-complete-3-critical (ConnectionRequests Redux state)
 * Task: T036
 *
 * State:
 * - receivedRequests: Requests received by current user
 * - sentRequests: Requests sent by current user
 * - loading: Boolean for async operations
 * - error: Error message string
 * - rateLimitStatus: Daily and weekly remaining requests
 * - statistics: Detailed request statistics
 *
 * Actions:
 * - fetchReceivedRequests: Load received requests with optional status filter
 * - fetchSentRequests: Load sent requests with optional status filter
 * - sendConnectionRequest: Send a new connection request with message
 * - acceptConnectionRequest: Accept a received request with optional response
 * - declineConnectionRequest: Decline a received request with optional reason
 * - cancelConnectionRequest: Cancel a sent pending request
 * - fetchRateLimitStatus: Check remaining daily/weekly requests
 * - fetchStatistics: Load detailed request statistics
 *
 * Created: 2025-10-14
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import connectionRequestsAPI, {
  ConnectionRequest,
  RateLimitStatus,
  ConnectionRequestStatistics,
} from '../../services/api/connectionRequestsAPI';

export interface ConnectionRequestsState {
  // Data
  receivedRequests: ConnectionRequest[];
  sentRequests: ConnectionRequest[];
  rateLimitStatus: RateLimitStatus | null;
  statistics: ConnectionRequestStatistics | null;

  // UI State
  loading: boolean;
  error: string | null;

  // Operation-specific loading states
  sending: boolean;
  accepting: boolean;
  declining: boolean;
  cancelling: boolean;

  // Current operation context
  currentRequestId: string | null;
}

const initialState: ConnectionRequestsState = {
  receivedRequests: [],
  sentRequests: [],
  rateLimitStatus: null,
  statistics: null,
  loading: false,
  error: null,
  sending: false,
  accepting: false,
  declining: false,
  cancelling: false,
  currentRequestId: null,
};

// ========================================================================
// Async Thunks
// ========================================================================

/**
 * Fetch connection requests received by the current user
 */
export const fetchReceivedRequests = createAsyncThunk(
  'connectionRequests/fetchReceivedRequests',
  async (status?: string) => {
    const requests = await connectionRequestsAPI.listReceivedRequests(status);
    return requests;
  }
);

/**
 * Fetch connection requests sent by the current user
 */
export const fetchSentRequests = createAsyncThunk(
  'connectionRequests/fetchSentRequests',
  async (status?: string) => {
    const requests = await connectionRequestsAPI.listSentRequests(status);
    return requests;
  }
);

/**
 * Send a connection request with a message
 */
export const sendConnectionRequest = createAsyncThunk(
  'connectionRequests/sendConnectionRequest',
  async ({ recipientId, message }: { recipientId: string; message: string }) => {
    const request = await connectionRequestsAPI.sendConnectionRequest(recipientId, message);
    return request;
  }
);

/**
 * Accept a connection request with optional response message
 */
export const acceptConnectionRequest = createAsyncThunk(
  'connectionRequests/acceptConnectionRequest',
  async ({ id, responseMessage }: { id: string; responseMessage?: string }) => {
    const request = await connectionRequestsAPI.acceptConnectionRequest(id, responseMessage);
    return request;
  }
);

/**
 * Decline a connection request with optional reason
 */
export const declineConnectionRequest = createAsyncThunk(
  'connectionRequests/declineConnectionRequest',
  async ({ id, reason }: { id: string; reason?: string }) => {
    const request = await connectionRequestsAPI.declineConnectionRequest(id, reason);
    return request;
  }
);

/**
 * Cancel a sent connection request
 */
export const cancelConnectionRequest = createAsyncThunk(
  'connectionRequests/cancelConnectionRequest',
  async (id: string) => {
    const request = await connectionRequestsAPI.cancelConnectionRequest(id);
    return request;
  }
);

/**
 * Fetch rate limit status for the current user
 */
export const fetchRateLimitStatus = createAsyncThunk(
  'connectionRequests/fetchRateLimitStatus',
  async () => {
    const status = await connectionRequestsAPI.getRateLimitStatus();
    return status;
  }
);

/**
 * Fetch connection request statistics for the current user
 */
export const fetchStatistics = createAsyncThunk(
  'connectionRequests/fetchStatistics',
  async () => {
    const stats = await connectionRequestsAPI.getStatistics();
    return stats;
  }
);

/**
 * Get decrypted message for a connection request
 */
export const getMessage = createAsyncThunk(
  'connectionRequests/getMessage',
  async (id: string) => {
    const message = await connectionRequestsAPI.getMessage(id);
    return { id, message };
  }
);

/**
 * Get decrypted response message for a connection request
 */
export const getResponseMessage = createAsyncThunk(
  'connectionRequests/getResponseMessage',
  async (id: string) => {
    const responseMessage = await connectionRequestsAPI.getResponseMessage(id);
    return { id, responseMessage };
  }
);

// ========================================================================
// Slice
// ========================================================================

const connectionRequestsSlice = createSlice({
  name: 'connectionRequests',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set current request ID for operations
    setCurrentRequestId: (state, action: PayloadAction<string | null>) => {
      state.currentRequestId = action.payload;
    },

    // Update request locally (optimistic UI or real-time Socket.io updates)
    updateRequestLocal: (state, action: PayloadAction<ConnectionRequest>) => {
      // Update in received requests
      const receivedIndex = state.receivedRequests.findIndex((r) => r.id === action.payload.id);
      if (receivedIndex !== -1) {
        state.receivedRequests[receivedIndex] = action.payload;
      }

      // Update in sent requests
      const sentIndex = state.sentRequests.findIndex((r) => r.id === action.payload.id);
      if (sentIndex !== -1) {
        state.sentRequests[sentIndex] = action.payload;
      }
    },

    // Add new request (real-time Socket.io notification)
    addReceivedRequest: (state, action: PayloadAction<ConnectionRequest>) => {
      state.receivedRequests.unshift(action.payload);
    },

    // Remove request from lists (cancelled/expired)
    removeRequest: (state, action: PayloadAction<string>) => {
      state.receivedRequests = state.receivedRequests.filter((r) => r.id !== action.payload);
      state.sentRequests = state.sentRequests.filter((r) => r.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // ========================================================================
    // Fetch Received Requests
    // ========================================================================
    builder
      .addCase(fetchReceivedRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceivedRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.receivedRequests = action.payload;
      })
      .addCase(fetchReceivedRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch received requests';
      });

    // ========================================================================
    // Fetch Sent Requests
    // ========================================================================
    builder
      .addCase(fetchSentRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSentRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.sentRequests = action.payload;
      })
      .addCase(fetchSentRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch sent requests';
      });

    // ========================================================================
    // Send Connection Request
    // ========================================================================
    builder
      .addCase(sendConnectionRequest.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendConnectionRequest.fulfilled, (state, action) => {
        state.sending = false;
        state.sentRequests.unshift(action.payload);
        // Update rate limit status optimistically (will be fetched later)
        if (state.rateLimitStatus) {
          state.rateLimitStatus.daily = Math.max(0, state.rateLimitStatus.daily - 1);
          state.rateLimitStatus.weekly = Math.max(0, state.rateLimitStatus.weekly - 1);
        }
      })
      .addCase(sendConnectionRequest.rejected, (state, action) => {
        state.sending = false;
        state.error = action.error.message || 'Failed to send connection request';
      });

    // ========================================================================
    // Accept Connection Request
    // ========================================================================
    builder
      .addCase(acceptConnectionRequest.pending, (state) => {
        state.accepting = true;
        state.error = null;
      })
      .addCase(acceptConnectionRequest.fulfilled, (state, action) => {
        state.accepting = false;
        const index = state.receivedRequests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.receivedRequests[index] = action.payload;
        }
      })
      .addCase(acceptConnectionRequest.rejected, (state, action) => {
        state.accepting = false;
        state.error = action.error.message || 'Failed to accept connection request';
      });

    // ========================================================================
    // Decline Connection Request
    // ========================================================================
    builder
      .addCase(declineConnectionRequest.pending, (state) => {
        state.declining = true;
        state.error = null;
      })
      .addCase(declineConnectionRequest.fulfilled, (state, action) => {
        state.declining = false;
        const index = state.receivedRequests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.receivedRequests[index] = action.payload;
        }
      })
      .addCase(declineConnectionRequest.rejected, (state, action) => {
        state.declining = false;
        state.error = action.error.message || 'Failed to decline connection request';
      });

    // ========================================================================
    // Cancel Connection Request
    // ========================================================================
    builder
      .addCase(cancelConnectionRequest.pending, (state) => {
        state.cancelling = true;
        state.error = null;
      })
      .addCase(cancelConnectionRequest.fulfilled, (state, action) => {
        state.cancelling = false;
        const index = state.sentRequests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.sentRequests[index] = action.payload;
        }
      })
      .addCase(cancelConnectionRequest.rejected, (state, action) => {
        state.cancelling = false;
        state.error = action.error.message || 'Failed to cancel connection request';
      });

    // ========================================================================
    // Fetch Rate Limit Status
    // ========================================================================
    builder
      .addCase(fetchRateLimitStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchRateLimitStatus.fulfilled, (state, action) => {
        state.rateLimitStatus = action.payload;
      })
      .addCase(fetchRateLimitStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch rate limit status';
      });

    // ========================================================================
    // Fetch Statistics
    // ========================================================================
    builder
      .addCase(fetchStatistics.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
        // Also update rate limit status from statistics
        state.rateLimitStatus = action.payload.rateLimit;
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch statistics';
      });

    // ========================================================================
    // Get Message
    // ========================================================================
    builder.addCase(getMessage.fulfilled, (state, action) => {
      if (action.payload.message) {
        // Store decrypted message temporarily
        const receivedIndex = state.receivedRequests.findIndex((r) => r.id === action.payload.id);
        if (receivedIndex !== -1) {
          state.receivedRequests[receivedIndex].message_encrypted = action.payload.message;
        }

        const sentIndex = state.sentRequests.findIndex((r) => r.id === action.payload.id);
        if (sentIndex !== -1) {
          state.sentRequests[sentIndex].message_encrypted = action.payload.message;
        }
      }
    });

    // ========================================================================
    // Get Response Message
    // ========================================================================
    builder.addCase(getResponseMessage.fulfilled, (state, action) => {
      if (action.payload.responseMessage) {
        // Store decrypted response message temporarily
        const receivedIndex = state.receivedRequests.findIndex((r) => r.id === action.payload.id);
        if (receivedIndex !== -1) {
          state.receivedRequests[receivedIndex].response_message_encrypted = action.payload.responseMessage;
        }

        const sentIndex = state.sentRequests.findIndex((r) => r.id === action.payload.id);
        if (sentIndex !== -1) {
          state.sentRequests[sentIndex].response_message_encrypted = action.payload.responseMessage;
        }
      }
    });
  },
});

export const {
  clearError,
  setCurrentRequestId,
  updateRequestLocal,
  addReceivedRequest,
  removeRequest,
} = connectionRequestsSlice.actions;

export default connectionRequestsSlice.reducer;
