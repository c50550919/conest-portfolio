import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CompatibilityScore from '../../src/components/common/CompatibilityScore';

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
 * CompatibilityScore Component Tests
 * Tests circular progress indicator, score display, and color coding
 */
describe('CompatibilityScore Component', () => {
  describe('score display', () => {
    it('should display score as percentage', () => {
      const { getByText } = render(<CompatibilityScore score={75} />);
      expect(getByText('75%')).toBeTruthy();
    });

    it('should round decimal scores', () => {
      const { getByText } = render(<CompatibilityScore score={75.6} />);
      expect(getByText('76%')).toBeTruthy();
    });

    it('should handle 0% score', () => {
      const { getByText } = render(<CompatibilityScore score={0} />);
      expect(getByText('0%')).toBeTruthy();
    });

    it('should handle 100% score', () => {
      const { getByText } = render(<CompatibilityScore score={100} />);
      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('score labels', () => {
    it('should show "Great Match" for scores >= 70', () => {
      const { getByText } = render(<CompatibilityScore score={70} />);
      expect(getByText('Great Match')).toBeTruthy();
    });

    it('should show "Great Match" for high scores', () => {
      const { getByText } = render(<CompatibilityScore score={95} />);
      expect(getByText('Great Match')).toBeTruthy();
    });

    it('should show "Good Match" for scores >= 40 and < 70', () => {
      const { getByText } = render(<CompatibilityScore score={50} />);
      expect(getByText('Good Match')).toBeTruthy();
    });

    it('should show "Good Match" at threshold 40', () => {
      const { getByText } = render(<CompatibilityScore score={40} />);
      expect(getByText('Good Match')).toBeTruthy();
    });

    it('should show "Fair Match" for scores < 40', () => {
      const { getByText } = render(<CompatibilityScore score={39} />);
      expect(getByText('Fair Match')).toBeTruthy();
    });

    it('should show "Fair Match" for very low scores', () => {
      const { getByText } = render(<CompatibilityScore score={10} />);
      expect(getByText('Fair Match')).toBeTruthy();
    });
  });

  describe('label visibility', () => {
    it('should show label by default', () => {
      const { getByText } = render(<CompatibilityScore score={75} />);
      expect(getByText('Great Match')).toBeTruthy();
    });

    it('should hide label when showLabel is false', () => {
      const { queryByText } = render(
        <CompatibilityScore score={75} showLabel={false} />
      );
      expect(queryByText('Great Match')).toBeNull();
    });
  });

  describe('onPress callback', () => {
    it('should call onPress when provided and pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <CompatibilityScore score={75} onPress={onPressMock} />
      );

      fireEvent.press(getByText('75%'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should not be touchable when onPress not provided', () => {
      const { getByText } = render(<CompatibilityScore score={75} />);
      // Component should render without TouchableOpacity wrapper
      expect(getByText('75%')).toBeTruthy();
    });
  });

  describe('size variations', () => {
    it('should render with default size', () => {
      const { getByText } = render(<CompatibilityScore score={75} />);
      expect(getByText('75%')).toBeTruthy();
    });

    it('should render with custom size', () => {
      const { getByText } = render(<CompatibilityScore score={75} size={120} />);
      expect(getByText('75%')).toBeTruthy();
    });

    it('should render with small size', () => {
      const { getByText } = render(<CompatibilityScore score={75} size={40} />);
      expect(getByText('75%')).toBeTruthy();
    });
  });

  describe('strokeWidth variations', () => {
    it('should render with default strokeWidth', () => {
      const { getByText } = render(<CompatibilityScore score={75} />);
      expect(getByText('75%')).toBeTruthy();
    });

    it('should render with custom strokeWidth', () => {
      const { getByText } = render(
        <CompatibilityScore score={75} strokeWidth={12} />
      );
      expect(getByText('75%')).toBeTruthy();
    });
  });

  describe('boundary conditions', () => {
    it('should handle score at Great Match boundary (69 vs 70)', () => {
      const { getByText: getByText69 } = render(<CompatibilityScore score={69} />);
      expect(getByText69('Good Match')).toBeTruthy();

      const { getByText: getByText70 } = render(<CompatibilityScore score={70} />);
      expect(getByText70('Great Match')).toBeTruthy();
    });

    it('should handle score at Good Match boundary (39 vs 40)', () => {
      const { getByText: getByText39 } = render(<CompatibilityScore score={39} />);
      expect(getByText39('Fair Match')).toBeTruthy();

      const { getByText: getByText40 } = render(<CompatibilityScore score={40} />);
      expect(getByText40('Good Match')).toBeTruthy();
    });
  });
});
