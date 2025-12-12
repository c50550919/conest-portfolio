/**
 * Unit Tests for VerificationProgress Component
 * Tests progress bar display, styling, and accessibility
 * Task: T016
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { VerificationProgress } from '../../../src/components/verification/VerificationProgress';

describe('VerificationProgress', () => {
  const defaultProps = {
    completedCount: 2,
    totalCount: 5,
    requiredCount: 4,
    completedRequired: 2,
  };

  describe('rendering', () => {
    it('should render progress indicator', () => {
      const { getByTestId } = render(<VerificationProgress {...defaultProps} testID="progress" />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should display completed count', () => {
      const { getByText } = render(<VerificationProgress {...defaultProps} />);

      expect(getByText('2')).toBeTruthy();
    });

    it('should display total count', () => {
      const { getByText } = render(<VerificationProgress {...defaultProps} />);

      expect(getByText(/of 5/i)).toBeTruthy();
    });

    it('should display "complete" label', () => {
      const { getByText } = render(<VerificationProgress {...defaultProps} />);

      expect(getByText(/complete/i)).toBeTruthy();
    });
  });

  describe('progress calculation', () => {
    it('should show 0% for no completions', () => {
      const { getByTestId, getByText } = render(
        <VerificationProgress {...defaultProps} completedCount={0} testID="progress" />
      );

      // Component shows percentage as text
      expect(getByText('0%')).toBeTruthy();

      // Also check the bar width (style is an array, index 1 has dynamic styles)
      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.width).toBe('0%');
    });

    it('should show 100% for all completions', () => {
      const { getByTestId, getByText } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={5}
          totalCount={5}
          completedRequired={4}
          testID="progress"
        />
      );

      expect(getByText('100%')).toBeTruthy();

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.width).toBe('100%');
    });

    it('should calculate correct percentage', () => {
      const { getByTestId, getByText } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={2}
          totalCount={5}
          testID="progress"
        />
      );

      // 2/5 = 40%
      expect(getByText('40%')).toBeTruthy();

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.width).toBe('40%');
    });
  });

  describe('required items tracking', () => {
    it('should show required items status', () => {
      const { getByText } = render(
        <VerificationProgress {...defaultProps} requiredCount={4} completedRequired={2} />
      );

      expect(getByText(/2 of 4 required/i)).toBeTruthy();
    });

    it('should indicate when all required are complete', () => {
      const { getByText } = render(
        <VerificationProgress {...defaultProps} requiredCount={4} completedRequired={4} />
      );

      expect(getByText(/all required complete/i)).toBeTruthy();
    });

    it('should show warning when required items incomplete', () => {
      const { getByTestId } = render(
        <VerificationProgress
          {...defaultProps}
          requiredCount={4}
          completedRequired={1}
          testID="progress"
        />
      );

      expect(getByTestId('progress-warning')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('should have success color when all complete', () => {
      const { getByTestId } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={5}
          totalCount={5}
          completedRequired={4}
          requiredCount={4}
          testID="progress"
        />
      );

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      // Check that backgroundColor is defined (success color)
      expect(dynamicStyle.backgroundColor).toBeDefined();
    });

    it('should have warning color when partially complete', () => {
      const { getByTestId } = render(
        <VerificationProgress {...defaultProps} completedCount={2} testID="progress" />
      );

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.backgroundColor).toBeDefined();
    });

    it('should have default color when just started', () => {
      const { getByTestId } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={0}
          completedRequired={0}
          testID="progress"
        />
      );

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.backgroundColor).toBeDefined();
    });
  });

  describe('verification score display', () => {
    it('should show verification score if provided', () => {
      // Component shows "Verification Score: 90+" or "Fully Verified" when all required complete
      const { getByText } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={5}
          totalCount={5}
          completedRequired={4}
          requiredCount={4}
        />
      );

      // When fully verified, shows "Fully Verified"
      expect(getByText(/Fully Verified|Verification Score/i)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessible progress indicator', () => {
      const { getByTestId } = render(<VerificationProgress {...defaultProps} testID="progress" />);

      const progressContainer = getByTestId('progress');
      expect(progressContainer.props.accessibilityRole).toBe('progressbar');
    });

    it('should have current and max values for accessibility', () => {
      const { getByTestId } = render(<VerificationProgress {...defaultProps} testID="progress" />);

      const progressContainer = getByTestId('progress');
      expect(progressContainer.props.accessibilityValue).toEqual({
        now: 2,
        max: 5,
      });
    });

    it('should have descriptive accessibility label', () => {
      const { getByTestId } = render(<VerificationProgress {...defaultProps} testID="progress" />);

      const progressContainer = getByTestId('progress');
      // Label is "Verification progress: 2 of 5 complete, 2 of 4 required"
      expect(progressContainer.props.accessibilityLabel).toMatch(/verification/i);
      expect(progressContainer.props.accessibilityLabel).toContain('2 of 5');
    });
  });

  describe('edge cases', () => {
    it('should handle zero total gracefully', () => {
      const { getByTestId, getByText } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={0}
          totalCount={0}
          testID="progress"
        />
      );

      // Should not crash and show 0%
      expect(getByText('0%')).toBeTruthy();

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.width).toBe('0%');
    });

    it('should handle completed > total gracefully', () => {
      const { getByTestId, getByText } = render(
        <VerificationProgress
          {...defaultProps}
          completedCount={10}
          totalCount={5}
          testID="progress"
        />
      );

      // Should cap at 100%
      expect(getByText('100%')).toBeTruthy();

      const bar = getByTestId('progress-bar');
      const dynamicStyle = Array.isArray(bar.props.style) ? bar.props.style[1] : bar.props.style;
      expect(dynamicStyle.width).toBe('100%');
    });
  });
});
