/**
 * Match Notifications Hook
 *
 * Purpose: React hook for Socket.io match notifications
 * Constitution: Principle IV (Performance - real-time updates)
 *
 * Features:
 * - Listens for match_created events
 * - Shows match modal on mutual match
 * - Cleans up listeners on unmount
 *
 * Created: 2025-10-06
 */

import { useEffect, useState, useCallback } from 'react';
import socketService, { MatchCreatedEvent } from '../services/socket';

export interface Match {
  matchId: string;
  matchedUserId: string;
  compatibilityScore: number;
  createdAt: string;
}

/**
 * Hook to listen for match notifications via Socket.io
 *
 * @returns Match state and handlers
 */
export function useMatchNotifications() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [isMatchModalVisible, setIsMatchModalVisible] = useState(false);

  // Handle match created event
  const handleMatchCreated = useCallback((data: MatchCreatedEvent) => {
    console.log('<‰ Match created:', data);

    // Update state to show match modal
    setCurrentMatch({
      matchId: data.matchId,
      matchedUserId: data.matchedUserId,
      compatibilityScore: data.compatibilityScore,
      createdAt: data.createdAt,
    });

    setIsMatchModalVisible(true);
  }, []);

  // Close match modal
  const closeMatchModal = useCallback(() => {
    setIsMatchModalVisible(false);
    setCurrentMatch(null);
  }, []);

  // Setup Socket.io listener
  useEffect(() => {
    // Add event listener
    socketService.onMatchCreated(handleMatchCreated);

    // Cleanup on unmount
    return () => {
      socketService.offMatchCreated(handleMatchCreated);
    };
  }, [handleMatchCreated]);

  return {
    currentMatch,
    isMatchModalVisible,
    closeMatchModal,
  };
}

/**
 * Hook to listen for screenshot detection alerts
 *
 * @returns Screenshot alert state and handlers
 */
export function useScreenshotAlerts() {
  const [screenshotAlert, setScreenshotAlert] = useState<{
    userId: string;
    timestamp: string;
  } | null>(null);

  const handleScreenshotDetected = useCallback(
    (data: { userId: string; timestamp: string }) => {
      console.log('=ø Screenshot detected:', data);
      setScreenshotAlert(data);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setScreenshotAlert(null);
      }, 5000);
    },
    []
  );

  const dismissAlert = useCallback(() => {
    setScreenshotAlert(null);
  }, []);

  useEffect(() => {
    socketService.onScreenshotDetected(handleScreenshotDetected);

    return () => {
      socketService.offScreenshotDetected(handleScreenshotDetected);
    };
  }, [handleScreenshotDetected]);

  return {
    screenshotAlert,
    dismissAlert,
  };
}

/**
 * Hook to manage Socket.io connection lifecycle
 *
 * Connects on mount, disconnects on unmount
 */
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        await socketService.connect();
        setIsConnected(socketService.connected());
      } catch (error) {
        console.error('Failed to connect socket:', error);
      }
    };

    connectSocket();

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(socketService.connected());
    }, 5000);

    return () => {
      clearInterval(interval);
      socketService.disconnect();
    };
  }, []);

  return { isConnected };
}
