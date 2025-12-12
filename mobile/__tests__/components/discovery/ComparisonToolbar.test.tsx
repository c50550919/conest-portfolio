/**
 * ComparisonToolbar Component Tests
 * Tests for the floating toolbar displayed when profiles are selected for comparison
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonToolbar } from '../../../src/components/discovery/ComparisonToolbar';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('ComparisonToolbar Component', () => {
  const mockOnComparePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when selectedCount is 0', () => {
      const { toJSON } = render(
        <ComparisonToolbar selectedCount={0} onComparePress={mockOnComparePress} />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render when selectedCount is greater than 0', () => {
      const { getByText } = render(
        <ComparisonToolbar selectedCount={1} onComparePress={mockOnComparePress} />
      );
      expect(getByText('1 profile selected')).toBeTruthy();
    });
  });

  describe('text content', () => {
    it('should display singular "profile" for 1 selection', () => {
      const { getByText } = render(
        <ComparisonToolbar selectedCount={1} onComparePress={mockOnComparePress} />
      );
      expect(getByText('1 profile selected')).toBeTruthy();
    });

    it('should display plural "profiles" for multiple selections', () => {
      const { getByText } = render(
        <ComparisonToolbar selectedCount={2} onComparePress={mockOnComparePress} />
      );
      expect(getByText('2 profiles selected')).toBeTruthy();
    });

    it('should handle 4 profiles (max comparison)', () => {
      const { getByText } = render(
        <ComparisonToolbar selectedCount={4} onComparePress={mockOnComparePress} />
      );
      expect(getByText('4 profiles selected')).toBeTruthy();
    });
  });

  describe('compare button', () => {
    it('should render compare button', () => {
      const { getByText } = render(
        <ComparisonToolbar selectedCount={2} onComparePress={mockOnComparePress} />
      );
      expect(getByText('Compare')).toBeTruthy();
    });

    it('should call onComparePress when button is pressed', () => {
      const { getByText } = render(
        <ComparisonToolbar selectedCount={2} onComparePress={mockOnComparePress} />
      );
      fireEvent.press(getByText('Compare'));
      expect(mockOnComparePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle re-renders correctly', () => {
      const { getByText, rerender, queryByText } = render(
        <ComparisonToolbar selectedCount={2} onComparePress={mockOnComparePress} />
      );
      expect(getByText('2 profiles selected')).toBeTruthy();

      rerender(
        <ComparisonToolbar selectedCount={0} onComparePress={mockOnComparePress} />
      );
      expect(queryByText('profiles selected')).toBeNull();
    });
  });
});
