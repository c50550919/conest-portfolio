/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Moderation Socket Integration
 * Connects Socket.io real-time moderation events to Redux store
 * Handles account status updates, message blocks, and moderation notifications
 *
 * Constitution: Principle I (Child Safety)
 */

import socketService from '../socket';
import { store } from '../../store';
import {
  receiveModerationNotification,
  setMessageBlocked,
  updateModerationStatus,
  ModerationStatus,
  AccountAction,
} from '../../store/slices/moderationSlice';

/**
 * Moderation notification event from server
 */
interface ModerationNotificationEvent {
  type: 'warning' | 'suspension' | 'ban' | 'status_update';
  status: ModerationStatus;
  action: AccountAction;
  reason?: string;
  suspensionUntil?: string;
  strikeCount?: number;
  timestamp: string;
}

/**
 * Message blocked event - when a sent message is flagged/blocked
 */
interface MessageBlockedEvent {
  messageId: string;
  conversationId: string;
  reason: string;
  category: 'child_safety_questionable' | 'child_predatory_risk';
  timestamp: string;
}

/**
 * Message moderation update event - for existing messages
 */
interface MessageModerationUpdateEvent {
  messageId: string;
  conversationId: string;
  moderationStatus: 'approved' | 'rejected' | 'pending';
  flaggedForReview: boolean;
}

/**
 * Account status sync event - periodic status synchronization
 */
interface AccountStatusSyncEvent {
  status: ModerationStatus;
  strikeCount: number;
  suspensionUntil?: string;
  lastChecked: string;
}

class ModerationSocketIntegration {
  private initialized = false;

  /**
   * Initialize moderation socket event listeners
   */
  initialize(): void {
    if (this.initialized) {
      console.log('Moderation socket integration already initialized');
      return;
    }

    if (!socketService.socket) {
      console.warn('Socket not connected, cannot initialize moderation integration');
      return;
    }

    console.log('Initializing moderation socket integration...');

    // Moderation notification (warnings, suspensions, bans)
    socketService.socket.on('moderation:notification', this.handleModerationNotification);

    // Message blocked notification
    socketService.socket.on('moderation:message_blocked', this.handleMessageBlocked);

    // Message moderation status update
    socketService.socket.on('moderation:message_update', this.handleMessageModerationUpdate);

    // Account status sync (periodic)
    socketService.socket.on('moderation:status_sync', this.handleAccountStatusSync);

    this.initialized = true;
    console.log('Moderation socket integration initialized successfully');
  }

  /**
   * Clean up socket event listeners
   */
  cleanup(): void {
    if (!this.initialized) {
      return;
    }

    console.log('Cleaning up moderation socket integration...');

    socketService.socket?.off('moderation:notification', this.handleModerationNotification);
    socketService.socket?.off('moderation:message_blocked', this.handleMessageBlocked);
    socketService.socket?.off('moderation:message_update', this.handleMessageModerationUpdate);
    socketService.socket?.off('moderation:status_sync', this.handleAccountStatusSync);

    this.initialized = false;
    console.log('Moderation socket integration cleaned up');
  }

  /**
   * Handle moderation notification (warning, suspension, ban)
   */
  private handleModerationNotification = (event: ModerationNotificationEvent): void => {
    console.log('Moderation notification received:', event);

    store.dispatch(
      receiveModerationNotification({
        type: event.type,
        status: event.status,
        action: event.action,
        reason: event.reason,
        suspensionUntil: event.suspensionUntil,
        strikeCount: event.strikeCount,
        timestamp: event.timestamp,
      })
    );
  };

  /**
   * Handle message blocked notification
   */
  private handleMessageBlocked = (event: MessageBlockedEvent): void => {
    console.log('Message blocked:', event);

    store.dispatch(
      setMessageBlocked({
        messageId: event.messageId,
        reason: event.reason,
      })
    );
  };

  /**
   * Handle message moderation status update
   */
  private handleMessageModerationUpdate = (event: MessageModerationUpdateEvent): void => {
    console.log('Message moderation update:', event);

    // This could dispatch to enhancedMessagesSlice to update the message status
    // For now, we'll just log it - the message list will update on next fetch
    console.log(
      `Message ${event.messageId} moderation status: ${event.moderationStatus}, flagged: ${event.flaggedForReview}`
    );
  };

  /**
   * Handle account status sync
   */
  private handleAccountStatusSync = (event: AccountStatusSyncEvent): void => {
    console.log('Account status sync:', event);

    store.dispatch(
      updateModerationStatus({
        status: event.status,
        strikeCount: event.strikeCount,
        suspensionUntil: event.suspensionUntil,
      })
    );
  };
}

// Export singleton instance
const moderationSocketIntegration = new ModerationSocketIntegration();

/**
 * Initialize moderation socket integration
 * Call this after user logs in and socket is connected
 */
export const initializeModerationSocket = (): void => {
  moderationSocketIntegration.initialize();
};

/**
 * Cleanup moderation socket integration
 * Call this when user logs out
 */
export const cleanupModerationSocket = (): void => {
  moderationSocketIntegration.cleanup();
};

export default moderationSocketIntegration;
