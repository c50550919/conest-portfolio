/**
 * Unit Tests for Moderation Redux Slice
 * Tests moderation state management, notifications, and account actions
 *
 * Constitution: Principle I (Child Safety)
 */

import { configureStore } from '@reduxjs/toolkit';
import moderationReducer, {
  receiveModerationNotification,
  updateModerationStatus,
  markNotificationRead,
  clearNotifications,
  setMessageBlocked,
  clearMessageBlocked,
  setShowStatusModal,
  resetModerationState,
  fetchModerationStatus,
  checkSuspension,
  selectModerationStatus,
  selectIsSuspended,
  selectSuspensionInfo,
  selectUnreadNotifications,
  selectLastMessageBlocked,
  ModerationState,
  ModerationStatus,
  AccountAction,
} from '../../src/store/slices/moderationSlice';

// Mock the API
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    getModerationStatus: jest.fn(),
    checkSuspension: jest.fn(),
  },
}));

import api from '../../src/services/api';
const mockApi = api as jest.Mocked<typeof api>;

describe('moderationSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const initialState: ModerationState = {
    status: 'good_standing',
    strikeCount: 0,
    suspensionUntil: null,
    suspensionReason: null,
    notifications: [],
    lastMessageBlocked: false,
    lastBlockedReason: null,
    loading: false,
    error: null,
    showStatusModal: false,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        moderation: moderationReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().moderation;
      expect(state.status).toBe('good_standing');
      expect(state.strikeCount).toBe(0);
      expect(state.suspensionUntil).toBeNull();
      expect(state.notifications).toEqual([]);
      expect(state.lastMessageBlocked).toBe(false);
      expect(state.showStatusModal).toBe(false);
    });
  });

  describe('receiveModerationNotification', () => {
    it('should add warning notification and update status', () => {
      store.dispatch(
        receiveModerationNotification({
          action: 'warning',
          reason: 'Test warning',
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('warned');
      expect(state.strikeCount).toBe(1);
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].action).toBe('warning');
      expect(state.notifications[0].reason).toBe('Test warning');
      expect(state.showStatusModal).toBe(true);
    });

    it('should handle 24h suspension notification', () => {
      store.dispatch(
        receiveModerationNotification({
          action: 'suspension_24h',
          reason: 'Policy violation',
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('suspended');
      expect(state.strikeCount).toBe(1);
      expect(state.suspensionUntil).not.toBeNull();
      expect(state.suspensionReason).toBe('Policy violation');
    });

    it('should handle 7-day suspension notification', () => {
      store.dispatch(
        receiveModerationNotification({
          action: 'suspension_7d',
          reason: 'Repeated violations',
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('suspended');
      expect(state.suspensionReason).toBe('Repeated violations');
      // Suspension should be ~7 days from now
      const suspensionDate = new Date(state.suspensionUntil!);
      const now = new Date();
      const diffDays = (suspensionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6);
      expect(diffDays).toBeLessThan(8);
    });

    it('should handle permanent ban notification', () => {
      store.dispatch(
        receiveModerationNotification({
          action: 'permanent_ban',
          reason: 'Child safety violation',
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('banned');
      expect(state.suspensionReason).toBe('Child safety violation');
    });

    it('should use provided status when available', () => {
      store.dispatch(
        receiveModerationNotification({
          action: 'warning',
          status: 'suspended',
          strikeCount: 3,
          suspensionUntil: '2025-12-31T00:00:00Z',
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('suspended');
      expect(state.strikeCount).toBe(3);
      expect(state.suspensionUntil).toBe('2025-12-31T00:00:00Z');
    });

    it('should accumulate strike count on multiple warnings', () => {
      store.dispatch(receiveModerationNotification({ action: 'warning' }));
      store.dispatch(receiveModerationNotification({ action: 'warning' }));
      store.dispatch(receiveModerationNotification({ action: 'warning' }));

      const state = store.getState().moderation;
      expect(state.strikeCount).toBe(3);
      expect(state.notifications).toHaveLength(3);
    });
  });

  describe('updateModerationStatus', () => {
    it('should update status directly', () => {
      store.dispatch(
        updateModerationStatus({
          status: 'warned',
          strikeCount: 2,
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('warned');
      expect(state.strikeCount).toBe(2);
    });

    it('should update suspension until', () => {
      const futureDate = '2025-12-31T00:00:00Z';
      store.dispatch(
        updateModerationStatus({
          status: 'suspended',
          suspensionUntil: futureDate,
        })
      );

      const state = store.getState().moderation;
      expect(state.status).toBe('suspended');
      expect(state.suspensionUntil).toBe(futureDate);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', () => {
      store.dispatch(receiveModerationNotification({ action: 'warning' }));
      const notifications = store.getState().moderation.notifications;
      const notificationId = notifications[0].id;

      store.dispatch(markNotificationRead(notificationId));

      const state = store.getState().moderation;
      expect(state.notifications[0].read).toBe(true);
    });

    it('should not affect other notifications', async () => {
      // Add slight delay between dispatches to ensure unique IDs (based on Date.now())
      store.dispatch(receiveModerationNotification({ action: 'warning' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      store.dispatch(receiveModerationNotification({ action: 'warning' }));

      // notifications[0] is newest (second dispatch), notifications[1] is oldest (first dispatch)
      const notifications = store.getState().moderation.notifications;
      const olderNotificationId = notifications[1].id;

      store.dispatch(markNotificationRead(olderNotificationId));

      const state = store.getState().moderation;
      expect(state.notifications[0].read).toBe(false); // Newer notification should be unread
      expect(state.notifications[1].read).toBe(true);  // Older notification should be read
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications', () => {
      store.dispatch(receiveModerationNotification({ action: 'warning' }));
      store.dispatch(receiveModerationNotification({ action: 'warning' }));

      store.dispatch(clearNotifications());

      const state = store.getState().moderation;
      expect(state.notifications).toEqual([]);
    });
  });

  describe('setMessageBlocked', () => {
    it('should set message blocked state', () => {
      store.dispatch(
        setMessageBlocked({
          messageId: 'msg-123',
          reason: 'Content violation detected',
        })
      );

      const state = store.getState().moderation;
      expect(state.lastMessageBlocked).toBe(true);
      expect(state.lastBlockedReason).toBe('Content violation detected');
    });

    it('should default blocked to true when not specified', () => {
      store.dispatch(setMessageBlocked({ reason: 'Test' }));
      expect(store.getState().moderation.lastMessageBlocked).toBe(true);
    });

    it('should allow explicit blocked: false', () => {
      store.dispatch(setMessageBlocked({ blocked: false }));
      expect(store.getState().moderation.lastMessageBlocked).toBe(false);
    });
  });

  describe('clearMessageBlocked', () => {
    it('should clear message blocked state', () => {
      store.dispatch(setMessageBlocked({ reason: 'Test' }));
      store.dispatch(clearMessageBlocked());

      const state = store.getState().moderation;
      expect(state.lastMessageBlocked).toBe(false);
      expect(state.lastBlockedReason).toBeNull();
    });
  });

  describe('setShowStatusModal', () => {
    it('should show status modal', () => {
      store.dispatch(setShowStatusModal(true));
      expect(store.getState().moderation.showStatusModal).toBe(true);
    });

    it('should hide status modal', () => {
      store.dispatch(setShowStatusModal(true));
      store.dispatch(setShowStatusModal(false));
      expect(store.getState().moderation.showStatusModal).toBe(false);
    });
  });

  describe('resetModerationState', () => {
    it('should reset to initial state', () => {
      // Set up some state
      store.dispatch(receiveModerationNotification({ action: 'warning' }));
      store.dispatch(setMessageBlocked({ reason: 'Test' }));

      // Reset
      store.dispatch(resetModerationState());

      const state = store.getState().moderation;
      expect(state).toEqual(initialState);
    });
  });

  describe('async thunks', () => {
    describe('fetchModerationStatus', () => {
      it('should fetch and set moderation status', async () => {
        const mockResponse = {
          data: {
            moderation_status: 'warned',
            moderation_strike_count: 2,
            suspension_until: null,
          },
        };
        mockApi.getModerationStatus.mockResolvedValueOnce(mockResponse);

        await store.dispatch(fetchModerationStatus());

        const state = store.getState().moderation;
        expect(state.status).toBe('warned');
        expect(state.strikeCount).toBe(2);
        expect(state.loading).toBe(false);
      });

      it('should handle fetch error', async () => {
        mockApi.getModerationStatus.mockRejectedValueOnce({
          response: { data: { message: 'Server error' } },
        });

        await store.dispatch(fetchModerationStatus());

        const state = store.getState().moderation;
        expect(state.error).toBe('Server error');
        expect(state.loading).toBe(false);
      });
    });

    describe('checkSuspension', () => {
      it('should handle suspended user (403 response)', async () => {
        mockApi.checkSuspension.mockRejectedValueOnce({
          response: {
            status: 403,
            data: {
              suspensionUntil: '2025-12-31T00:00:00Z',
              reason: 'Policy violation',
            },
          },
        });

        await store.dispatch(checkSuspension());

        const state = store.getState().moderation;
        expect(state.status).toBe('suspended');
        expect(state.suspensionUntil).toBe('2025-12-31T00:00:00Z');
        expect(state.showStatusModal).toBe(true);
      });

      it('should handle non-suspended user', async () => {
        mockApi.checkSuspension.mockResolvedValueOnce({
          data: { isSuspended: false },
        });

        await store.dispatch(checkSuspension());

        const state = store.getState().moderation;
        expect(state.status).toBe('good_standing');
      });
    });
  });

  describe('selectors', () => {
    it('selectModerationStatus should return status', () => {
      const state = { moderation: { ...initialState, status: 'warned' as ModerationStatus } };
      expect(selectModerationStatus(state)).toBe('warned');
    });

    it('selectIsSuspended should return true for suspended', () => {
      const state = { moderation: { ...initialState, status: 'suspended' as ModerationStatus } };
      expect(selectIsSuspended(state)).toBe(true);
    });

    it('selectIsSuspended should return true for banned', () => {
      const state = { moderation: { ...initialState, status: 'banned' as ModerationStatus } };
      expect(selectIsSuspended(state)).toBe(true);
    });

    it('selectIsSuspended should return false for good_standing', () => {
      expect(selectIsSuspended({ moderation: initialState })).toBe(false);
    });

    it('selectSuspensionInfo should return suspension details', () => {
      const state = {
        moderation: {
          ...initialState,
          suspensionUntil: '2025-12-31T00:00:00Z',
          suspensionReason: 'Test reason',
        },
      };
      const info = selectSuspensionInfo(state);
      expect(info.until).toBe('2025-12-31T00:00:00Z');
      expect(info.reason).toBe('Test reason');
    });

    it('selectUnreadNotifications should filter unread', () => {
      const state = {
        moderation: {
          ...initialState,
          notifications: [
            { id: '1', action: 'warning' as AccountAction, reason: 'Test', receivedAt: '', read: false },
            { id: '2', action: 'warning' as AccountAction, reason: 'Test', receivedAt: '', read: true },
            { id: '3', action: 'warning' as AccountAction, reason: 'Test', receivedAt: '', read: false },
          ],
        },
      };
      const unread = selectUnreadNotifications(state);
      expect(unread).toHaveLength(2);
      expect(unread.every((n) => !n.read)).toBe(true);
    });

    it('selectLastMessageBlocked should return blocked info', () => {
      const state = {
        moderation: {
          ...initialState,
          lastMessageBlocked: true,
          lastBlockedReason: 'Content violation',
        },
      };
      const info = selectLastMessageBlocked(state);
      expect(info.blocked).toBe(true);
      expect(info.reason).toBe('Content violation');
    });
  });
});
