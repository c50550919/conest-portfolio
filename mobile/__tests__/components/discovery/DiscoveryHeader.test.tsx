/**
 * DiscoveryHeader Component Tests
 *
 * LOW-RISK - Header UI component
 *
 * Key Test Areas:
 * 1. Title rendering
 * 2. View mode toggle (grid/list/map icons)
 * 3. Sort button
 * 4. Filter button with badge
 * 5. Button press handlers
 * 6. Filter count badge display
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
  };
});

import { DiscoveryHeader } from '../../../src/components/discovery/DiscoveryHeader';

describe('DiscoveryHeader', () => {
  const mockOnViewModeToggle = jest.fn();
  const mockOnSortPress = jest.fn();
  const mockOnFilterPress = jest.fn();

  const defaultProps = {
    viewMode: 'grid' as const,
    activeFilterCount: 0,
    onViewModeToggle: mockOnViewModeToggle,
    onSortPress: mockOnSortPress,
    onFilterPress: mockOnFilterPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render header title', () => {
      const { getByText } = render(<DiscoveryHeader {...defaultProps} />);

      expect(getByText('Browse Connections')).toBeTruthy();
    });

    it('should render view mode button', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      expect(getByTestId('icon-view-grid')).toBeTruthy();
    });

    it('should render sort button', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      expect(getByTestId('icon-sort')).toBeTruthy();
    });

    it('should render filter button', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      expect(getByTestId('icon-filter')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VIEW MODE ICON TESTS
  // ===========================================================================

  describe('View Mode Icon', () => {
    it('should show grid icon when viewMode is grid', () => {
      const { getByTestId } = render(
        <DiscoveryHeader {...defaultProps} viewMode="grid" />
      );

      expect(getByTestId('icon-view-grid')).toBeTruthy();
    });

    it('should show list icon when viewMode is list', () => {
      const { getByTestId } = render(
        <DiscoveryHeader {...defaultProps} viewMode="list" />
      );

      expect(getByTestId('icon-view-list')).toBeTruthy();
    });

    it('should show map icon when viewMode is map', () => {
      const { getByTestId } = render(
        <DiscoveryHeader {...defaultProps} viewMode="map" />
      );

      expect(getByTestId('icon-map')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BUTTON PRESS TESTS
  // ===========================================================================

  describe('Button Press Handlers', () => {
    it('should call onViewModeToggle when view mode button is pressed', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      // Find the parent touchable by getting the icon's parent
      const viewModeIcon = getByTestId('icon-view-grid');
      fireEvent.press(viewModeIcon);

      expect(mockOnViewModeToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onSortPress when sort button is pressed', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      const sortIcon = getByTestId('icon-sort');
      fireEvent.press(sortIcon);

      expect(mockOnSortPress).toHaveBeenCalledTimes(1);
    });

    it('should call onFilterPress when filter button is pressed', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      const filterIcon = getByTestId('icon-filter');
      fireEvent.press(filterIcon);

      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // FILTER BADGE TESTS
  // ===========================================================================

  describe('Filter Badge', () => {
    it('should NOT show badge when activeFilterCount is 0', () => {
      const { queryByText } = render(
        <DiscoveryHeader {...defaultProps} activeFilterCount={0} />
      );

      // Badge text should not be present
      expect(queryByText('0')).toBeNull();
    });

    it('should show badge with count when activeFilterCount > 0', () => {
      const { getByText } = render(
        <DiscoveryHeader {...defaultProps} activeFilterCount={3} />
      );

      expect(getByText('3')).toBeTruthy();
    });

    it('should show badge with single digit count', () => {
      const { getByText } = render(
        <DiscoveryHeader {...defaultProps} activeFilterCount={1} />
      );

      expect(getByText('1')).toBeTruthy();
    });

    it('should show badge with double digit count', () => {
      const { getByText } = render(
        <DiscoveryHeader {...defaultProps} activeFilterCount={12} />
      );

      expect(getByText('12')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible icons', () => {
      const { getByTestId } = render(<DiscoveryHeader {...defaultProps} />);

      expect(getByTestId('icon-view-grid')).toBeTruthy();
      expect(getByTestId('icon-sort')).toBeTruthy();
      expect(getByTestId('icon-filter')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle unknown viewMode gracefully (default to grid)', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const { getByTestId } = render(
        <DiscoveryHeader {...defaultProps} viewMode={'unknown' as any} />
      );

      expect(getByTestId('icon-view-grid')).toBeTruthy();
    });

    it('should handle large filter counts', () => {
      const { getByText } = render(
        <DiscoveryHeader {...defaultProps} activeFilterCount={99} />
      );

      expect(getByText('99')).toBeTruthy();
    });
  });
});
