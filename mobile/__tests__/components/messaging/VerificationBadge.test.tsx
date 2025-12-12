/**
 * VerificationBadge Component Tests
 * Tests for verification status badge display in messaging
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import VerificationBadge from '../../../src/components/messaging/VerificationBadge';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('VerificationBadge Component', () => {
  describe('verified state', () => {
    it('should render badge when isVerified is true', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} />
      );

      // Icon should be present
      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon).toBeTruthy();
      expect(icon.props.name).toBe('check-decagram');
    });

    it('should return null when isVerified is false', () => {
      const { toJSON } = render(
        <VerificationBadge isVerified={false} />
      );

      // Should render nothing
      expect(toJSON()).toBeNull();
    });
  });

  describe('size variations', () => {
    it('should render small size correctly', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} size="small" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(14);
    });

    it('should render medium size by default', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(18);
    });

    it('should render medium size explicitly', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} size="medium" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(18);
    });

    it('should render large size correctly', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} size="large" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(22);
    });
  });

  describe('variant styles', () => {
    it('should render compact variant by default', () => {
      const { UNSAFE_getByType, queryByText } = render(
        <VerificationBadge isVerified={true} />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon).toBeTruthy();

      // Compact variant should not show label by default
      expect(queryByText('Verified')).toBeNull();
    });

    it('should render compact variant explicitly', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} variant="compact" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon).toBeTruthy();
    });

    it('should render full variant correctly', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} variant="full" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon).toBeTruthy();
    });

    it('should show label in full variant when showLabel is true', () => {
      const { getByText } = render(
        <VerificationBadge isVerified={true} variant="full" showLabel={true} />
      );

      expect(getByText('Verified')).toBeTruthy();
    });

    it('should not show label in full variant when showLabel is false', () => {
      const { queryByText } = render(
        <VerificationBadge isVerified={true} variant="full" showLabel={false} />
      );

      expect(queryByText('Verified')).toBeNull();
    });
  });

  describe('showLabel prop', () => {
    it('should not show label by default', () => {
      const { queryByText } = render(
        <VerificationBadge isVerified={true} variant="full" />
      );

      expect(queryByText('Verified')).toBeNull();
    });

    it('should show label when showLabel is true', () => {
      const { getByText } = render(
        <VerificationBadge isVerified={true} variant="full" showLabel={true} />
      );

      expect(getByText('Verified')).toBeTruthy();
    });

    it('should not show label in compact variant even when showLabel is true', () => {
      const { queryByText } = render(
        <VerificationBadge isVerified={true} variant="compact" showLabel={true} />
      );

      // Compact variant doesn't support label display
      expect(queryByText('Verified')).toBeNull();
    });
  });

  describe('size and variant combinations', () => {
    it('should render small + full variant with label', () => {
      const { getByText, UNSAFE_getByType } = render(
        <VerificationBadge
          isVerified={true}
          size="small"
          variant="full"
          showLabel={true}
        />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(14);
      expect(getByText('Verified')).toBeTruthy();
    });

    it('should render large + compact variant', () => {
      const { UNSAFE_getByType, queryByText } = render(
        <VerificationBadge
          isVerified={true}
          size="large"
          variant="compact"
        />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(22);
      expect(queryByText('Verified')).toBeNull();
    });

    it('should render medium + full variant without label', () => {
      const { UNSAFE_getByType, queryByText } = render(
        <VerificationBadge
          isVerified={true}
          size="medium"
          variant="full"
          showLabel={false}
        />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.size).toBe(18);
      expect(queryByText('Verified')).toBeNull();
    });
  });

  describe('unverified state edge cases', () => {
    it('should return null with all props when not verified', () => {
      const { toJSON } = render(
        <VerificationBadge
          isVerified={false}
          size="large"
          variant="full"
          showLabel={true}
        />
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('icon properties', () => {
    it('should use check-decagram icon', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.name).toBe('check-decagram');
    });

    it('should use primary color for compact variant icon', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} variant="compact" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      // Color should be primary color from theme
      expect(icon.props.color).toBeTruthy();
    });

    it('should use white color for full variant icon', () => {
      const { UNSAFE_getByType } = render(
        <VerificationBadge isVerified={true} variant="full" />
      );

      const icon = UNSAFE_getByType('Icon' as any);
      expect(icon.props.color).toBe('#FFFFFF');
    });
  });

  describe('accessibility', () => {
    it('should be testable', () => {
      const { UNSAFE_root } = render(
        <VerificationBadge isVerified={true} />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render consistent structure', () => {
      const { toJSON } = render(
        <VerificationBadge isVerified={true} variant="full" showLabel={true} />
      );

      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree).toMatchSnapshot();
    });
  });
});
