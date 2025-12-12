/**
 * Moderation Slice
 *
 * Manages user moderation status, warnings, suspensions, and bans.
 * Tracks account standing and displays appropriate UI feedback.
 *
 * Constitution: Principle I (Child Safety)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * User moderation status levels
 */
export type ModerationStatus =
  | 'good_standing'
  | 'warned'
  | 'suspended'
  | 'banned';

/**
 * Account action types for notifications
 */
export type AccountAction =
  | 'none'
  | 'warning'
  | 'suspension_24h'
  | 'suspension_7d'
  | 'permanent_ban';

/**
 * Moderation notification received from push
 */
export interface ModerationNotification {
  id: string;
  action: AccountAction;
  reason: string;
  receivedAt: string;
  read: boolean;
}

/**
 * User's moderation state
 */
export interface ModerationState {
  status: ModerationStatus;
  strikeCount: number;
  suspensionUntil: string | null;
  suspensionReason: string | null;
  notifications: ModerationNotification[];
  lastMessageBlocked: boolean;
  lastBlockedReason: string | null;
  loading: boolean;
  error: string | null;
  showStatusModal: boolean;
}

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

/**
 * Fetch current moderation status from server
 */
export const fetchModerationStatus = createAsyncThunk(
  'moderation/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.getModerationStatus();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch moderation status'
      );
    }
  }
);

/**
 * Check if user is currently suspended
 */
export const checkSuspension = createAsyncThunk(
  'moderation/checkSuspension',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.checkSuspension();
      return response.data;
    } catch (error: any) {
      // 403 means suspended
      if (error.response?.status === 403) {
        return {
          isSuspended: true,
          suspensionUntil: error.response.data.suspensionUntil,
          reason: error.response.data.reason,
        };
      }
      return rejectWithValue(
        error.response?.data?.message || 'Failed to check suspension'
      );
    }
  }
);

const moderationSlice = createSlice({
  name: 'moderation',
  initialState,
  reducers: {
    /**
     * Handle incoming moderation notification from push/socket
     */
    receiveModerationNotification: (
      state,
      action: PayloadAction<{
        type?: 'warning' | 'suspension' | 'ban' | 'status_update';
        status?: ModerationStatus;
        action: AccountAction;
        reason?: string;
        suspensionUntil?: string;
        strikeCount?: number;
        timestamp?: string;
      }>
    ) => {
      const notification: ModerationNotification = {
        id: Date.now().toString(),
        action: action.payload.action,
        reason: action.payload.reason || 'Community guidelines violation',
        receivedAt: action.payload.timestamp || new Date().toISOString(),
        read: false,
      };

      state.notifications.unshift(notification);

      // Update status from payload if provided
      if (action.payload.status) {
        state.status = action.payload.status;
      }

      // Update strike count if provided
      if (action.payload.strikeCount !== undefined) {
        state.strikeCount = action.payload.strikeCount;
      }

      // Update suspension info if provided
      if (action.payload.suspensionUntil) {
        state.suspensionUntil = action.payload.suspensionUntil;
        state.suspensionReason = action.payload.reason || null;
      }

      // Fallback: Update status based on action if not directly provided
      if (!action.payload.status) {
        switch (action.payload.action) {
          case 'warning':
            state.status = 'warned';
            state.strikeCount += 1;
            break;
          case 'suspension_24h':
            state.status = 'suspended';
            state.strikeCount += 1;
            state.suspensionUntil = new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString();
            state.suspensionReason = action.payload.reason || null;
            break;
          case 'suspension_7d':
            state.status = 'suspended';
            state.strikeCount += 1;
            state.suspensionUntil = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString();
            state.suspensionReason = action.payload.reason || null;
            break;
          case 'permanent_ban':
            state.status = 'banned';
            state.suspensionReason = action.payload.reason || null;
            break;
        }
      }

      state.showStatusModal = true;
    },

    /**
     * Update moderation status directly (for sync events)
     */
    updateModerationStatus: (
      state,
      action: PayloadAction<{
        status: ModerationStatus;
        strikeCount?: number;
        suspensionUntil?: string;
      }>
    ) => {
      state.status = action.payload.status;
      if (action.payload.strikeCount !== undefined) {
        state.strikeCount = action.payload.strikeCount;
      }
      if (action.payload.suspensionUntil !== undefined) {
        state.suspensionUntil = action.payload.suspensionUntil;
      }
    },

    /**
     * Mark notification as read
     */
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },

    /**
     * Clear all notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },

    /**
     * Set message blocked state (for UI feedback)
     */
    setMessageBlocked: (
      state,
      action: PayloadAction<{ messageId?: string; blocked?: boolean; reason?: string }>
    ) => {
      state.lastMessageBlocked = action.payload.blocked ?? true;
      state.lastBlockedReason = action.payload.reason || null;
    },

    /**
     * Clear message blocked state
     */
    clearMessageBlocked: (state) => {
      state.lastMessageBlocked = false;
      state.lastBlockedReason = null;
    },

    /**
     * Show/hide status modal
     */
    setShowStatusModal: (state, action: PayloadAction<boolean>) => {
      state.showStatusModal = action.payload;
    },

    /**
     * Reset moderation state (on logout)
     */
    resetModerationState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch moderation status
      .addCase(fetchModerationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModerationStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload.moderation_status || 'good_standing';
        state.strikeCount = action.payload.moderation_strike_count || 0;
        state.suspensionUntil = action.payload.suspension_until || null;
        state.suspensionReason = action.payload.suspension_reason || null;
      })
      .addCase(fetchModerationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Check suspension
      .addCase(checkSuspension.fulfilled, (state, action) => {
        if (action.payload.isSuspended) {
          state.status = 'suspended';
          state.suspensionUntil = action.payload.suspensionUntil;
          state.suspensionReason = action.payload.reason;
          state.showStatusModal = true;
        }
      });
  },
});

export const {
  receiveModerationNotification,
  updateModerationStatus,
  markNotificationRead,
  clearNotifications,
  setMessageBlocked,
  clearMessageBlocked,
  setShowStatusModal,
  resetModerationState,
} = moderationSlice.actions;

export default moderationSlice.reducer;

/**
 * Selectors
 */
export const selectModerationStatus = (state: { moderation: ModerationState }) =>
  state.moderation.status;

export const selectIsSuspended = (state: { moderation: ModerationState }) =>
  state.moderation.status === 'suspended' || state.moderation.status === 'banned';

export const selectSuspensionInfo = (state: { moderation: ModerationState }) => ({
  until: state.moderation.suspensionUntil,
  reason: state.moderation.suspensionReason,
});

export const selectUnreadNotifications = (state: { moderation: ModerationState }) =>
  state.moderation.notifications.filter((n) => !n.read);

export const selectLastMessageBlocked = (state: { moderation: ModerationState }) => ({
  blocked: state.moderation.lastMessageBlocked,
  reason: state.moderation.lastBlockedReason,
});
