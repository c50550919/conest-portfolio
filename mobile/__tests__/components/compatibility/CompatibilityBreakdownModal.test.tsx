/**
 * CompatibilityBreakdownModal Component Tests
 *
 * MEDIUM-RISK - Displays compatibility analysis
 *
 * Key Test Areas:
 * 1. Modal visibility
 * 2. Header rendering (title, profile names, overall score)
 * 3. Dimension cards rendering
 * 4. Score colors (green/yellow/orange/red)
 * 5. Progress bars
 * 6. Close button functionality
 * 7. Empty state handling
 * 8. Scroll behavior
 * 9. Accessibility
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

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      React.createElement(Text, { testID: `ionicon-${name}`, ...props }, name),
  };
});

// Mock LinearGradient
jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }, children),
  };
});

import CompatibilityBreakdownModal, {
  CompatibilityBreakdown,
} from '../../../src/components/compatibility/CompatibilityBreakdownModal';

// Use fake timers to handle animations
jest.useFakeTimers();

describe('CompatibilityBreakdownModal', () => {
  const mockOnClose = jest.fn();

  const mockBreakdown: CompatibilityBreakdown = {
    overallScore: 85,
    calculatedAt: '2025-03-15T10:30:00Z',
    dimensions: [
      {
        dimension: 'Schedule Compatibility',
        score: 92,
        weight: 25,
        explanation: 'Your work schedules align well for shared childcare responsibilities.',
        icon: 'calendar-clock',
      },
      {
        dimension: 'Parenting Philosophy',
        score: 78,
        weight: 20,
        explanation: 'You share similar views on discipline and education.',
        icon: 'account-child',
      },
      {
        dimension: 'House Rules',
        score: 85,
        weight: 20,
        explanation: 'Your expectations for household cleanliness and guest policies match.',
        icon: 'home-outline',
      },
      {
        dimension: 'Location & Schools',
        score: 90,
        weight: 15,
        explanation: 'Both prefer the same neighborhood with good school districts.',
        icon: 'map-marker',
      },
      {
        dimension: 'Budget Match',
        score: 70,
        weight: 10,
        explanation: 'Your housing budgets are within 15% of each other.',
        icon: 'currency-usd',
      },
      {
        dimension: 'Lifestyle Factors',
        score: 45,
        weight: 10,
        explanation: 'Some differences in pet preferences and noise tolerance.',
        icon: 'heart-outline',
      },
    ],
  };

  const defaultProps = {
    visible: true,
    breakdown: mockBreakdown,
    profile1Name: 'John',
    profile2Name: 'Sarah',
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Run all pending timers to prevent async operations after teardown
    jest.runOnlyPendingTimers();
  });

  // ===========================================================================
  // VISIBILITY TESTS
  // ===========================================================================

  describe('Visibility', () => {
    it('should render modal when visible is true', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('compatibility-breakdown-modal')).toBeTruthy();
    });

    it('should return null when breakdown is null', () => {
      const { queryByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} breakdown={null} />
      );

      expect(queryByTestId('compatibility-breakdown-modal')).toBeNull();
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header', () => {
    it('should display modal title', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('Compatibility Analysis')).toBeTruthy();
    });

    it('should display profile names', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('John & Sarah')).toBeTruthy();
    });

    it('should display overall score', () => {
      const { getAllByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      // 85% appears in header and potentially in dimensions
      expect(getAllByText('85%').length).toBeGreaterThan(0);
    });

    it('should display score label for excellent match', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('Excellent Match')).toBeTruthy();
    });

    it('should display chart icon', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('icon-chart-donut')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CLOSE BUTTON TESTS
  // ===========================================================================

  describe('Close Button', () => {
    it('should render close button', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('ionicon-close')).toBeTruthy();
    });

    it('should call onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      fireEvent.press(getByTestId('ionicon-close'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // DIMENSION CARDS TESTS
  // ===========================================================================

  describe('Dimension Cards', () => {
    it('should render all 6 dimension cards', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('dimension-card-0')).toBeTruthy();
      expect(getByTestId('dimension-card-1')).toBeTruthy();
      expect(getByTestId('dimension-card-2')).toBeTruthy();
      expect(getByTestId('dimension-card-3')).toBeTruthy();
      expect(getByTestId('dimension-card-4')).toBeTruthy();
      expect(getByTestId('dimension-card-5')).toBeTruthy();
    });

    it('should display dimension titles', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('Schedule Compatibility')).toBeTruthy();
      expect(getByText('Parenting Philosophy')).toBeTruthy();
      expect(getByText('House Rules')).toBeTruthy();
      expect(getByText('Location & Schools')).toBeTruthy();
      expect(getByText('Budget Match')).toBeTruthy();
      expect(getByText('Lifestyle Factors')).toBeTruthy();
    });

    it('should display dimension scores', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('92%')).toBeTruthy();
      expect(getByText('78%')).toBeTruthy();
      expect(getByText('70%')).toBeTruthy();
      expect(getByText('45%')).toBeTruthy();
    });

    it('should display dimension weights', () => {
      const { getByText, getAllByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('Weight: 25%')).toBeTruthy();
      // Weight: 20% appears twice (Parenting Philosophy and House Rules)
      expect(getAllByText('Weight: 20%').length).toBeGreaterThan(0);
      expect(getByText('Weight: 15%')).toBeTruthy();
      // Weight: 10% appears twice (Budget Match and Lifestyle Factors)
      expect(getAllByText('Weight: 10%').length).toBeGreaterThan(0);
    });

    it('should display dimension explanations', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText(/work schedules align well/)).toBeTruthy();
      expect(getByText(/similar views on discipline/)).toBeTruthy();
    });

    it('should display dimension icons', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('icon-calendar-clock')).toBeTruthy();
      expect(getByTestId('icon-account-child')).toBeTruthy();
      expect(getByTestId('icon-home-outline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORE COLOR TESTS
  // ===========================================================================

  describe('Score Colors', () => {
    it('should show Excellent label for score >= 80', () => {
      const { getAllByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      // 92% and 90% and 85% should show "Excellent" (multiple dimensions)
      expect(getAllByText('Excellent').length).toBeGreaterThan(0);
    });

    it('should show Good label for score 60-79', () => {
      const { getAllByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      // 78% and 70% should show "Good" (multiple dimensions)
      expect(getAllByText('Good').length).toBeGreaterThan(0);
    });

    it('should show Fair label for score 40-59', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      // 45% should show "Fair"
      expect(getByText('Fair')).toBeTruthy();
    });

    it('should show Poor label for score < 40', () => {
      const lowScoreBreakdown = {
        ...mockBreakdown,
        dimensions: [
          {
            ...mockBreakdown.dimensions[0],
            score: 25,
          },
        ],
      };

      const { getByText } = render(
        <CompatibilityBreakdownModal
          {...defaultProps}
          breakdown={lowScoreBreakdown}
        />
      );

      expect(getByText('Poor')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROGRESS BARS TESTS
  // ===========================================================================

  describe('Progress Bars', () => {
    it('should render progress bars for each dimension', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('progress-bar-0')).toBeTruthy();
      expect(getByTestId('progress-bar-1')).toBeTruthy();
      expect(getByTestId('progress-bar-2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EXPLANATION SECTION TESTS
  // ===========================================================================

  describe('Explanation Section', () => {
    it('should display how compatibility is calculated', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('How we calculate compatibility:')).toBeTruthy();
      expect(getByText(/analyze 6 key dimensions/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // FOOTER TESTS
  // ===========================================================================

  describe('Footer', () => {
    it('should display calculation timestamp', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText(/Calculated on/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCROLL TESTS
  // ===========================================================================

  describe('Scroll', () => {
    it('should render scrollable dimensions container', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('dimensions-scroll')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible close button', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      // Close button icon should be present and tappable
      const closeIcon = getByTestId('ionicon-close');
      expect(closeIcon).toBeTruthy();
    });

    it('should have accessible modal', () => {
      const { getByTestId } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByTestId('compatibility-breakdown-modal')).toBeTruthy();
    });
  });

  // ===========================================================================
  // OVERALL SCORE LABEL TESTS
  // ===========================================================================

  describe('Overall Score Labels', () => {
    it('should show Excellent Match for overall score >= 80', () => {
      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} />
      );

      expect(getByText('Excellent Match')).toBeTruthy();
    });

    it('should show Good Match for overall score 60-79', () => {
      const goodBreakdown = { ...mockBreakdown, overallScore: 70 };

      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} breakdown={goodBreakdown} />
      );

      expect(getByText('Good Match')).toBeTruthy();
    });

    it('should show Fair Match for overall score 40-59', () => {
      const fairBreakdown = { ...mockBreakdown, overallScore: 50 };

      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} breakdown={fairBreakdown} />
      );

      expect(getByText('Fair Match')).toBeTruthy();
    });

    it('should show Poor Match for overall score < 40', () => {
      const poorBreakdown = { ...mockBreakdown, overallScore: 30 };

      const { getByText } = render(
        <CompatibilityBreakdownModal {...defaultProps} breakdown={poorBreakdown} />
      );

      expect(getByText('Poor Match')).toBeTruthy();
    });
  });
});
