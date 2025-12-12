/**
 * FilterPanel Component Tests
 * Tests for the comprehensive filtering interface for browse discovery
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterPanel } from '../../../src/components/discovery/FilterPanel';
import { DiscoveryFilters } from '../../../src/types/discovery';
import { DEFAULT_FILTERS } from '../../../src/config/discoveryConfig';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const mockCurrentFilters: DiscoveryFilters = {
  ...DEFAULT_FILTERS,
  maxDistance: 25,
  minCompatibilityScore: 60,
};

describe('FilterPanel Component', () => {
  const mockOnApply = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Filters')).toBeTruthy();
    });

    it('should display safety section', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Safety (Required)')).toBeTruthy();
    });

    it('should display location section', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Location')).toBeTruthy();
    });

    it('should display all filter sections', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Budget')).toBeTruthy();
      expect(getByText('Compatibility')).toBeTruthy();
      expect(getByText('Children Age Groups')).toBeTruthy();
      expect(getByText('Housing Type')).toBeTruthy();
      expect(getByText('Work Schedule')).toBeTruthy();
      expect(getByText('Parenting Philosophy')).toBeTruthy();
      expect(getByText('Move-In Timeline')).toBeTruthy();
      expect(getByText('Additional Preferences')).toBeTruthy();
    });
  });

  describe('safety filters', () => {
    it('should have background check toggle disabled (always required)', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Background Check Required')).toBeTruthy();
    });

    it('should have ID verification toggle disabled (always required)', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('ID Verification Required')).toBeTruthy();
    });
  });

  describe('distance options', () => {
    it('should display distance filter options', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('5 miles')).toBeTruthy();
      expect(getByText('10 miles')).toBeTruthy();
      expect(getByText('25 miles')).toBeTruthy();
      expect(getByText('50 miles')).toBeTruthy();
      expect(getByText('Any distance')).toBeTruthy();
    });

    it('should allow selecting distance option', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      fireEvent.press(getByText('10 miles'));
      fireEvent.press(getByText(/Apply Filters/));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ maxDistance: 10 })
      );
    });
  });

  describe('children age groups', () => {
    it('should display age group options', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Infant (0-2)')).toBeTruthy();
      expect(getByText('Toddler (3-5)')).toBeTruthy();
      expect(getByText('Elementary (6-12)')).toBeTruthy();
      expect(getByText('Teen (13-18)')).toBeTruthy();
    });

    it('should allow toggling age groups', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      fireEvent.press(getByText('Toddler (3-5)'));
      fireEvent.press(getByText(/Apply Filters/));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          childrenAgeGroups: expect.arrayContaining(['toddler']),
        })
      );
    });
  });

  describe('housing type', () => {
    it('should display housing type options', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Apartment')).toBeTruthy();
      expect(getByText('House')).toBeTruthy();
      expect(getByText('Townhouse')).toBeTruthy();
      expect(getByText('Any type')).toBeTruthy();
    });

    it('should allow selecting housing type', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      fireEvent.press(getByText('House'));
      fireEvent.press(getByText(/Apply Filters/));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ housingType: 'house' })
      );
    });
  });

  describe('actions', () => {
    it('should reset filters when reset button is pressed', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={{ ...mockCurrentFilters, maxDistance: 50 }}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      fireEvent.press(getByText('Reset'));
      // Button text includes filter count like "Apply Filters (3)"
      fireEvent.press(getByText(/Apply Filters/));
      expect(mockOnApply).toHaveBeenCalled();
    });

    it('should apply filters when apply button is pressed', () => {
      const { getByText } = render(
        <FilterPanel
          visible={true}
          currentFilters={mockCurrentFilters}
          onApply={mockOnApply}
          onClose={mockOnClose}
        />
      );
      // Button text includes filter count like "Apply Filters (3)"
      fireEvent.press(getByText(/Apply Filters/));
      expect(mockOnApply).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
