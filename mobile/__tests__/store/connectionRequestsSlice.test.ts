/**
 * Unit Tests for Connection Requests Redux Slice
 * Tests connection request feature state management with async thunks
 */

import { configureStore } from '@reduxjs/toolkit';
import connectionRequestsReducer, {
  fetchReceivedRequests,
  fetchSentRequests,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  fetchRateLimitStatus,
  fetchStatistics,
  getMessage,
  getResponseMessage,
  clearError,
  setCurrentRequestId,
  updateRequestLocal,
  addReceivedRequest,
  removeRequest,
  ConnectionRequestsState,
} from '../../src/store/slices/connectionRequestsSlice';
import { ConnectionRequest, RateLimitStatus, ConnectionRequestStatistics } from '../../src/services/api/connectionRequestsAPI';

// Mock the API
jest.mock('../../src/services/api/connectionRequestsAPI', () => ({
  __esModule: true,
  default: {
    listReceivedRequests: jest.fn(),
    listSentRequests: jest.fn(),
    sendConnectionRequest: jest.fn(),
    acceptConnectionRequest: jest.fn(),
    declineConnectionRequest: jest.fn(),
    cancelConnectionRequest: jest.fn(),
    getRateLimitStatus: jest.fn(),
    getStatistics: jest.fn(),
    getMessage: jest.fn(),
    getResponseMessage: jest.fn(),
  },
}));

describe('connectionRequestsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockRequest: ConnectionRequest = {
    id: 'req-123',
    sender_id: 'user-1',
    recipient_id: 'user-2',
    status: 'pending',
    message_encrypted: 'Hello!',
    response_message_encrypted: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockRateLimitStatus: RateLimitStatus = {
    daily: 5,
    weekly: 20,
    dailyLimit: 10,
    weeklyLimit: 30,
  };

  const mockStatistics: ConnectionRequestStatistics = {
    totalSent: 15,
    totalReceived: 10,
    pendingSent: 3,
    pendingReceived: 2,
    acceptedSent: 8,
    acceptedReceived: 5,
    declinedSent: 4,
    declinedReceived: 3,
    rateLimit: mockRateLimitStatus,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        connectionRequests: connectionRequestsReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().connectionRequests as ConnectionRequestsState;

      expect(state.receivedRequests).toEqual([]);
      expect(state.sentRequests).toEqual([]);
      expect(state.rateLimitStatus).toBeNull();
      expect(state.statistics).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.sending).toBe(false);
      expect(state.accepting).toBe(false);
      expect(state.declining).toBe(false);
      expect(state.cancelling).toBe(false);
      expect(state.currentRequestId).toBeNull();
    });
  });

  describe('fetchReceivedRequests', () => {
    it('should set loading to true when pending', () => {
      store.dispatch(fetchReceivedRequests.pending('', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update receivedRequests when fulfilled', () => {
      store.dispatch(fetchReceivedRequests.fulfilled([mockRequest], '', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.loading).toBe(false);
      expect(state.receivedRequests).toEqual([mockRequest]);
    });

    it('should set error when rejected', () => {
      const error = new Error('Network error');
      store.dispatch(fetchReceivedRequests.rejected(error, '', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchSentRequests', () => {
    it('should set loading to true when pending', () => {
      store.dispatch(fetchSentRequests.pending('', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.loading).toBe(true);
    });

    it('should update sentRequests when fulfilled', () => {
      store.dispatch(fetchSentRequests.fulfilled([mockRequest], '', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.loading).toBe(false);
      expect(state.sentRequests).toEqual([mockRequest]);
    });
  });

  describe('sendConnectionRequest', () => {
    it('should set sending to true when pending', () => {
      store.dispatch(sendConnectionRequest.pending('', { recipientId: 'user-2', message: 'Hi!' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.sending).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add request to sentRequests and update rate limit when fulfilled', () => {
      // Set initial rate limit
      store.dispatch(fetchRateLimitStatus.fulfilled(mockRateLimitStatus, '', undefined));

      store.dispatch(sendConnectionRequest.fulfilled(mockRequest, '', { recipientId: 'user-2', message: 'Hi!' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.sending).toBe(false);
      expect(state.sentRequests[0]).toEqual(mockRequest);
      expect(state.rateLimitStatus?.daily).toBe(4); // Decremented
      expect(state.rateLimitStatus?.weekly).toBe(19); // Decremented
    });

    it('should set error when rejected', () => {
      const error = new Error('Rate limit exceeded');
      store.dispatch(sendConnectionRequest.rejected(error, '', { recipientId: 'user-2', message: 'Hi!' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.sending).toBe(false);
      expect(state.error).toBe('Rate limit exceeded');
    });
  });

  describe('acceptConnectionRequest', () => {
    it('should set accepting to true when pending', () => {
      store.dispatch(acceptConnectionRequest.pending('', { id: 'req-123' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.accepting).toBe(true);
    });

    it('should update request status when fulfilled', () => {
      store.dispatch(fetchReceivedRequests.fulfilled([mockRequest], '', undefined));
      const acceptedRequest = { ...mockRequest, status: 'accepted' as const };
      store.dispatch(acceptConnectionRequest.fulfilled(acceptedRequest, '', { id: 'req-123' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.accepting).toBe(false);
      expect(state.receivedRequests[0].status).toBe('accepted');
    });
  });

  describe('declineConnectionRequest', () => {
    it('should set declining to true when pending', () => {
      store.dispatch(declineConnectionRequest.pending('', { id: 'req-123' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.declining).toBe(true);
    });

    it('should update request status when fulfilled', () => {
      store.dispatch(fetchReceivedRequests.fulfilled([mockRequest], '', undefined));
      const declinedRequest = { ...mockRequest, status: 'declined' as const };
      store.dispatch(declineConnectionRequest.fulfilled(declinedRequest, '', { id: 'req-123' }));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.declining).toBe(false);
      expect(state.receivedRequests[0].status).toBe('declined');
    });
  });

  describe('cancelConnectionRequest', () => {
    it('should set cancelling to true when pending', () => {
      store.dispatch(cancelConnectionRequest.pending('', 'req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.cancelling).toBe(true);
    });

    it('should update request status when fulfilled', () => {
      store.dispatch(fetchSentRequests.fulfilled([mockRequest], '', undefined));
      const cancelledRequest = { ...mockRequest, status: 'cancelled' as const };
      store.dispatch(cancelConnectionRequest.fulfilled(cancelledRequest, '', 'req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.cancelling).toBe(false);
      expect(state.sentRequests[0].status).toBe('cancelled');
    });
  });

  describe('fetchRateLimitStatus', () => {
    it('should update rateLimitStatus when fulfilled', () => {
      store.dispatch(fetchRateLimitStatus.fulfilled(mockRateLimitStatus, '', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.rateLimitStatus).toEqual(mockRateLimitStatus);
    });
  });

  describe('fetchStatistics', () => {
    it('should update statistics and rateLimitStatus when fulfilled', () => {
      store.dispatch(fetchStatistics.fulfilled(mockStatistics, '', undefined));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.statistics).toEqual(mockStatistics);
      expect(state.rateLimitStatus).toEqual(mockStatistics.rateLimit);
    });
  });

  describe('getMessage', () => {
    it('should update message in request when fulfilled', () => {
      store.dispatch(fetchReceivedRequests.fulfilled([mockRequest], '', undefined));
      store.dispatch(getMessage.fulfilled({ id: 'req-123', message: 'Decrypted message' }, '', 'req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.receivedRequests[0].message_encrypted).toBe('Decrypted message');
    });

    it('should update message in sent requests', () => {
      store.dispatch(fetchSentRequests.fulfilled([mockRequest], '', undefined));
      store.dispatch(getMessage.fulfilled({ id: 'req-123', message: 'Decrypted message' }, '', 'req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.sentRequests[0].message_encrypted).toBe('Decrypted message');
    });
  });

  describe('getResponseMessage', () => {
    it('should update response message when fulfilled', () => {
      const requestWithResponse = { ...mockRequest, status: 'accepted' as const };
      store.dispatch(fetchSentRequests.fulfilled([requestWithResponse], '', undefined));
      store.dispatch(getResponseMessage.fulfilled({ id: 'req-123', responseMessage: 'Thanks!' }, '', 'req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.sentRequests[0].response_message_encrypted).toBe('Thanks!');
    });
  });

  describe('synchronous actions', () => {
    it('should clear error', () => {
      const error = new Error('Test error');
      store.dispatch(fetchReceivedRequests.rejected(error, '', undefined));
      store.dispatch(clearError());

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.error).toBeNull();
    });

    it('should set current request ID', () => {
      store.dispatch(setCurrentRequestId('req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.currentRequestId).toBe('req-123');
    });

    it('should set current request ID to null', () => {
      store.dispatch(setCurrentRequestId('req-123'));
      store.dispatch(setCurrentRequestId(null));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.currentRequestId).toBeNull();
    });

    it('should update request locally', () => {
      store.dispatch(fetchReceivedRequests.fulfilled([mockRequest], '', undefined));
      const updated = { ...mockRequest, status: 'accepted' as const };
      store.dispatch(updateRequestLocal(updated));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.receivedRequests[0].status).toBe('accepted');
    });

    it('should add received request (for Socket.io)', () => {
      const newRequest = { ...mockRequest, id: 'req-456' };
      store.dispatch(addReceivedRequest(newRequest));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.receivedRequests[0]).toEqual(newRequest);
    });

    it('should remove request from both lists', () => {
      store.dispatch(fetchReceivedRequests.fulfilled([mockRequest], '', undefined));
      store.dispatch(fetchSentRequests.fulfilled([{ ...mockRequest, id: 'req-456' }], '', undefined));
      store.dispatch(removeRequest('req-123'));

      const state = store.getState().connectionRequests as ConnectionRequestsState;
      expect(state.receivedRequests).toHaveLength(0);
      expect(state.sentRequests).toHaveLength(1);
    });
  });
});
