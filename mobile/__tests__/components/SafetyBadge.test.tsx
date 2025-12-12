import React from 'react';
import { render } from '@testing-library/react-native';
import SafetyBadge from '../../src/components/common/SafetyBadge';

/**
 * SafetyBadge Component Tests
 * Tests verification badge display and status indicators
 * Updated to match current component API
 */
describe('SafetyBadge Component', () => {
  describe('verified status', () => {
    it('should render verified ID badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="id" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should render verified background badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="background" />
      );

      expect(getByText('Background Check')).toBeTruthy();
    });

    it('should render verified phone badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="phone" />
      );

      expect(getByText('Phone Verified')).toBeTruthy();
    });

    it('should render verified email badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="email" />
      );

      expect(getByText('Email Verified')).toBeTruthy();
    });

    it('should render verified income badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="income" />
      );

      expect(getByText('Income Verified')).toBeTruthy();
    });
  });

  describe('partial status', () => {
    it('should render partial verification badge', () => {
      const { getByText } = render(
        <SafetyBadge status="partial" type="id" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });
  });

  describe('unverified status', () => {
    it('should render unverified badge', () => {
      const { getByText } = render(
        <SafetyBadge status="unverified" type="id" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });
  });

  describe('size variations', () => {
    it('should render small badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="id" size="small" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should render medium badge (default)', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="id" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should render large badge', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="id" size="large" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });
  });

  describe('label visibility', () => {
    it('should show label by default', () => {
      const { getByText } = render(
        <SafetyBadge status="verified" type="id" />
      );

      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should hide label when showLabel is false', () => {
      const { queryByText } = render(
        <SafetyBadge status="verified" type="id" showLabel={false} />
      );

      expect(queryByText('ID Verified')).toBeNull();
    });
  });
});
