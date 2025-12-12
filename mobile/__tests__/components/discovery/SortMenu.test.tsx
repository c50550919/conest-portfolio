/**
 * SortMenu Component Tests
 * Tests for the sort options dropdown menu
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SortMenu } from '../../../src/components/discovery/SortMenu';
import { SortOption } from '../../../src/types/discovery';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('SortMenu Component', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when not visible', () => {
      const { toJSON } = render(
        <SortMenu visible={false} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render when visible', () => {
      const { getByText } = render(
        <SortMenu visible={true} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      expect(getByText('Best Match')).toBeTruthy();
    });
  });

  describe('sort options', () => {
    it('should display all sort options', () => {
      const { getByText } = render(
        <SortMenu visible={true} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      expect(getByText('Best Match')).toBeTruthy();
      expect(getByText('Closest')).toBeTruthy();
      expect(getByText('Recently Active')).toBeTruthy();
      expect(getByText('Soonest Move-In')).toBeTruthy();
    });
  });

  describe('selection', () => {
    it('should call onSelect with "compatibility" when Best Match is pressed', () => {
      const { getByText } = render(
        <SortMenu visible={true} currentSort="distance" onSelect={mockOnSelect} />
      );
      fireEvent.press(getByText('Best Match'));
      expect(mockOnSelect).toHaveBeenCalledWith('compatibility');
    });

    it('should call onSelect with "distance" when Closest is pressed', () => {
      const { getByText } = render(
        <SortMenu visible={true} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      fireEvent.press(getByText('Closest'));
      expect(mockOnSelect).toHaveBeenCalledWith('distance');
    });

    it('should call onSelect with "recent" when Recently Active is pressed', () => {
      const { getByText } = render(
        <SortMenu visible={true} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      fireEvent.press(getByText('Recently Active'));
      expect(mockOnSelect).toHaveBeenCalledWith('recent');
    });

    it('should call onSelect with "move-in-date" when Soonest Move-In is pressed', () => {
      const { getByText } = render(
        <SortMenu visible={true} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      fireEvent.press(getByText('Soonest Move-In'));
      expect(mockOnSelect).toHaveBeenCalledWith('move-in-date');
    });
  });

  describe('current sort indicator', () => {
    it('should highlight selected sort option', () => {
      const { UNSAFE_queryAllByType } = render(
        <SortMenu visible={true} currentSort="compatibility" onSelect={mockOnSelect} />
      );
      const icons = UNSAFE_queryAllByType('Icon');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
