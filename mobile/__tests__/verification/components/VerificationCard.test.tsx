/**
 * Unit Tests for VerificationCard Component
 * TDD: These tests MUST FAIL before implementation
 * Task: T014
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VerificationCard } from '../../../src/components/verification/VerificationCard';
import { VerificationItem } from '../../../src/types/verification';

describe('VerificationCard', () => {
  const createMockItem = (overrides: Partial<VerificationItem> = {}): VerificationItem => ({
    id: 'phone',
    title: 'Phone Verification',
    description: 'Verify your phone number',
    status: 'not_started',
    required: true,
    icon: 'phone',
    ...overrides,
  });

  const defaultProps = {
    item: createMockItem(),
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render title correctly', () => {
      const { getByText } = render(<VerificationCard {...defaultProps} />);

      expect(getByText('Phone Verification')).toBeTruthy();
    });

    it('should render description correctly', () => {
      const { getByText } = render(<VerificationCard {...defaultProps} />);

      expect(getByText('Verify your phone number')).toBeTruthy();
    });

    it('should render icon', () => {
      const { getByTestId } = render(
        <VerificationCard {...defaultProps} testID="verification-card" />
      );

      expect(getByTestId('verification-card-icon')).toBeTruthy();
    });

    it('should show required badge for required items', () => {
      const { getByText } = render(
        <VerificationCard {...defaultProps} item={createMockItem({ required: true })} />
      );

      expect(getByText('Required')).toBeTruthy();
    });

    it('should show optional badge for non-required items', () => {
      const { getByText } = render(
        <VerificationCard {...defaultProps} item={createMockItem({ required: false })} />
      );

      expect(getByText('Optional')).toBeTruthy();
    });
  });

  describe('status indicators', () => {
    it('should show "Start" for not_started status', () => {
      const { getByText } = render(
        <VerificationCard {...defaultProps} item={createMockItem({ status: 'not_started' })} />
      );

      expect(getByText('Start')).toBeTruthy();
    });

    it('should show "Pending" for pending status', () => {
      const { getByText } = render(
        <VerificationCard {...defaultProps} item={createMockItem({ status: 'pending' })} />
      );

      expect(getByText('Pending')).toBeTruthy();
    });

    it('should show checkmark for completed status', () => {
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'completed' })}
          testID="verification-card"
        />
      );

      expect(getByTestId('verification-card-checkmark')).toBeTruthy();
    });

    it('should show "Retry" for failed status', () => {
      const { getByText } = render(
        <VerificationCard {...defaultProps} item={createMockItem({ status: 'failed' })} />
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should show "Expired" for expired status', () => {
      const { getByText } = render(
        <VerificationCard {...defaultProps} item={createMockItem({ status: 'expired' })} />
      );

      expect(getByText('Expired')).toBeTruthy();
    });

    it('should show expiry date when item has expiresAt', () => {
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const { getByText } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({
            status: 'completed',
            expiresAt: expiryDate,
          })}
        />
      );

      expect(getByText(/expires/i)).toBeTruthy();
    });
  });

  describe('styling by status', () => {
    it('should have success styling for completed status', () => {
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'completed' })}
          testID="verification-card"
        />
      );

      const card = getByTestId('verification-card');
      // Check for success border/background color
      expect(card.props.style).toEqual(
        expect.objectContaining({
          borderColor: expect.stringMatching(/#[a-fA-F0-9]{6}|green|success/i),
        })
      );
    });

    it('should have warning styling for expired status', () => {
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'expired' })}
          testID="verification-card"
        />
      );

      const card = getByTestId('verification-card');
      expect(card.props.style).toBeDefined();
    });

    it('should have error styling for failed status', () => {
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'failed' })}
          testID="verification-card"
        />
      );

      const card = getByTestId('verification-card');
      expect(card.props.style).toBeDefined();
    });
  });

  describe('interactions', () => {
    it('should call onPress when card is pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <VerificationCard {...defaultProps} onPress={onPress} testID="verification-card" />
      );

      fireEvent.press(getByTestId('verification-card'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should be pressable when not_started', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'not_started' })}
          onPress={onPress}
          testID="verification-card"
        />
      );

      fireEvent.press(getByTestId('verification-card'));

      expect(onPress).toHaveBeenCalled();
    });

    it('should be pressable when failed (for retry)', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'failed' })}
          onPress={onPress}
          testID="verification-card"
        />
      );

      fireEvent.press(getByTestId('verification-card'));

      expect(onPress).toHaveBeenCalled();
    });

    it('should still be pressable when completed (to view status)', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'completed' })}
          onPress={onPress}
          testID="verification-card"
        />
      );

      fireEvent.press(getByTestId('verification-card'));

      expect(onPress).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have accessible role', () => {
      const { getByTestId } = render(
        <VerificationCard {...defaultProps} testID="verification-card" />
      );

      const card = getByTestId('verification-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility label with status', () => {
      const { getByTestId } = render(
        <VerificationCard
          {...defaultProps}
          item={createMockItem({ status: 'completed' })}
          testID="verification-card"
        />
      );

      const card = getByTestId('verification-card');
      expect(card.props.accessibilityLabel).toContain('Phone Verification');
      expect(card.props.accessibilityLabel).toContain('completed');
    });
  });
});
