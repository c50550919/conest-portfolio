/**
 * MatchModal Component Tests
 * Tests for the "Household Match!" celebration modal
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MatchModal from '../../../src/components/discovery/MatchModal';
import { Match } from '../../../src/hooks/useMatchNotifications';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('MatchModal Component', () => {
  const mockMatch: Match = {
    matchId: 'match-123',
    matchedUserId: 'user-456',
    compatibilityScore: 85,
    createdAt: '2025-02-01T12:00:00Z',
  };

  const mockOnClose = jest.fn();
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible with match', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('Household Match!')).toBeTruthy();
    });

    it('should not render when match is null', () => {
      const { toJSON } = render(
        <MatchModal
          visible={true}
          match={null}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should display subtitle text', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('You both expressed interest in connecting!')).toBeTruthy();
    });
  });

  describe('compatibility score', () => {
    it('should display compatibility score', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display "Household Fit" label', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('Household Fit')).toBeTruthy();
    });
  });

  describe('match details', () => {
    it('should display match ID', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('Match ID: match-123')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('should render "Start Chatting" button', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('Start Chatting')).toBeTruthy();
    });

    it('should render "Continue Searching" button', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('Continue Searching')).toBeTruthy();
    });

    it('should call onSendMessage when "Start Chatting" is pressed', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      fireEvent.press(getByText('Start Chatting'));
      expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when "Continue Searching" is pressed', () => {
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={mockMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      fireEvent.press(getByText('Continue Searching'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very high compatibility score', () => {
      const highMatch = { ...mockMatch, compatibilityScore: 100 };
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={highMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('100%')).toBeTruthy();
    });

    it('should handle lower compatibility score', () => {
      const lowMatch = { ...mockMatch, compatibilityScore: 65 };
      const { getByText } = render(
        <MatchModal
          visible={true}
          match={lowMatch}
          onClose={mockOnClose}
          onSendMessage={mockOnSendMessage}
        />
      );
      expect(getByText('65%')).toBeTruthy();
    });
  });
});
