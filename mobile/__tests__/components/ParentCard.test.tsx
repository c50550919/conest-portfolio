import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ParentCard from '../../src/components/common/ParentCard';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(View, { testID: 'svg', ...props }, children),
    Svg: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(View, { testID: 'svg', ...props }, children),
    Circle: (props: { [key: string]: unknown }) =>
      React.createElement(View, { testID: 'svg-circle', ...props }),
  };
});

/**
 * ParentCard Component Tests
 * Tests parent profile card display
 * CRITICAL: Verifies NO child data is displayed - parent profiles only
 */
describe('ParentCard Component', () => {
  const defaultProps = {
    id: 'parent-123',
    name: 'Sarah Johnson',
    location: 'San Francisco, CA',
    childrenCount: 2,
    compatibilityScore: 85,
    isVerified: true,
    hasBackgroundCheck: true,
  };

  describe('basic information display', () => {
    it('should display parent name', () => {
      const { getByText } = render(<ParentCard {...defaultProps} />);
      expect(getByText('Sarah Johnson')).toBeTruthy();
    });

    it('should display location', () => {
      const { getByText } = render(<ParentCard {...defaultProps} />);
      expect(getByText('San Francisco, CA')).toBeTruthy();
    });

    it('should display children count with plural', () => {
      const { getByText } = render(<ParentCard {...defaultProps} childrenCount={2} />);
      expect(getByText('2 children')).toBeTruthy();
    });

    it('should display children count with singular', () => {
      const { getByText } = render(<ParentCard {...defaultProps} childrenCount={1} />);
      expect(getByText('1 child')).toBeTruthy();
    });

    it('should NOT display any child details (names, ages, etc.)', () => {
      // This is critical for Constitution Principle I - No child data storage
      const { getAllByText, queryByText } = render(<ParentCard {...defaultProps} />);
      // Only count should be shown, no specific details
      const childTexts = getAllByText(/child/i);
      expect(childTexts.length).toBeGreaterThan(0); // "2 children" exists
      // Verify no child-specific data patterns exist
      expect(queryByText(/years? old/i)).toBeNull();
      expect(queryByText(/grade/i)).toBeNull();
    });
  });

  describe('profile photo', () => {
    it('should display profile photo when provided', () => {
      const { queryByTestId } = render(
        <ParentCard {...defaultProps} profilePhoto="https://example.com/photo.jpg" />
      );
      // Placeholder icon should NOT be present when photo is provided
      expect(queryByTestId('icon-account')).toBeNull();
    });

    it('should display placeholder icon when no photo', () => {
      const { getByTestId } = render(<ParentCard {...defaultProps} />);
      expect(getByTestId('icon-account')).toBeTruthy();
    });
  });

  describe('work schedule', () => {
    it('should display work schedule when provided', () => {
      const { getByText } = render(
        <ParentCard {...defaultProps} workSchedule="9-5 weekdays" />
      );
      expect(getByText('9-5 weekdays')).toBeTruthy();
    });

    it('should not show schedule chip when not provided', () => {
      const { queryByText } = render(<ParentCard {...defaultProps} />);
      expect(queryByText('9-5 weekdays')).toBeNull();
    });
  });

  describe('verification badges', () => {
    it('should show ID verified badge when verified', () => {
      const { getByText } = render(<ParentCard {...defaultProps} isVerified={true} />);
      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should show background check badge when has background check', () => {
      const { getByText } = render(
        <ParentCard {...defaultProps} hasBackgroundCheck={true} />
      );
      expect(getByText('Background Check')).toBeTruthy();
    });

    it('should not show ID badge when not verified', () => {
      const { queryByText } = render(<ParentCard {...defaultProps} isVerified={false} />);
      expect(queryByText('ID Verified')).toBeNull();
    });

    it('should not show background badge when no background check', () => {
      const { queryByText } = render(
        <ParentCard {...defaultProps} hasBackgroundCheck={false} />
      );
      expect(queryByText('Background Check')).toBeNull();
    });
  });

  describe('compatibility score', () => {
    it('should display compatibility score', () => {
      const { getByText } = render(<ParentCard {...defaultProps} compatibilityScore={85} />);
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display different score values', () => {
      const { getByText } = render(<ParentCard {...defaultProps} compatibilityScore={42} />);
      expect(getByText('42%')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('should display View Profile button', () => {
      const { getByText } = render(<ParentCard {...defaultProps} />);
      expect(getByText('View Profile')).toBeTruthy();
    });

    it('should display Message button', () => {
      const { getByText } = render(<ParentCard {...defaultProps} />);
      expect(getByText('Message')).toBeTruthy();
    });

    it('should call onViewPress when View Profile pressed', () => {
      const onViewPressMock = jest.fn();
      const { getByText } = render(
        <ParentCard {...defaultProps} onViewPress={onViewPressMock} />
      );

      fireEvent.press(getByText('View Profile'));
      expect(onViewPressMock).toHaveBeenCalledTimes(1);
    });

    it('should call onMessagePress when Message pressed', () => {
      const onMessagePressMock = jest.fn();
      const { getByText } = render(
        <ParentCard {...defaultProps} onMessagePress={onMessagePressMock} />
      );

      fireEvent.press(getByText('Message'));
      expect(onMessagePressMock).toHaveBeenCalledTimes(1);
    });

    it('should call onCardPress when card pressed', () => {
      const onCardPressMock = jest.fn();
      const { getByText } = render(
        <ParentCard {...defaultProps} onCardPress={onCardPressMock} />
      );

      fireEvent.press(getByText('Sarah Johnson'));
      expect(onCardPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('icons', () => {
    it('should render location icon', () => {
      const { getByTestId } = render(<ParentCard {...defaultProps} />);
      expect(getByTestId('icon-map-marker')).toBeTruthy();
    });

    it('should render children icon', () => {
      const { getByTestId } = render(<ParentCard {...defaultProps} />);
      expect(getByTestId('icon-account-child')).toBeTruthy();
    });

    it('should render calendar icon for schedule when provided', () => {
      const { getByTestId } = render(
        <ParentCard {...defaultProps} workSchedule="Remote" />
      );
      expect(getByTestId('icon-calendar-clock')).toBeTruthy();
    });

    it('should render eye icon for view button', () => {
      const { getByTestId } = render(<ParentCard {...defaultProps} />);
      expect(getByTestId('icon-eye')).toBeTruthy();
    });

    it('should render message icon for message button', () => {
      const { getByTestId } = render(<ParentCard {...defaultProps} />);
      expect(getByTestId('icon-message')).toBeTruthy();
    });
  });

  describe('child safety compliance', () => {
    // Constitution Principle I: NO child data storage
    it('should only display child COUNT, never specific child information', () => {
      const { getByText, queryByText } = render(
        <ParentCard {...defaultProps} childrenCount={3} />
      );

      // Should show count
      expect(getByText('3 children')).toBeTruthy();

      // Should NOT show any specific child data patterns
      expect(queryByText(/name:/i)).toBeNull();
      expect(queryByText(/age:/i)).toBeNull();
      expect(queryByText(/school/i)).toBeNull();
    });
  });
});
