import React from 'react';
import { render } from '@testing-library/react-native';
import TrustIndicator from '../../src/components/common/TrustIndicator';

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

/**
 * TrustIndicator Component Tests
 * Tests trust metrics display: verification age, references, response rate, account age
 */
describe('TrustIndicator Component', () => {
  const defaultProps = {
    daysSinceVerification: 30,
    referenceCount: 5,
    responseRate: 95,
    accountAgeDays: 180,
  };

  describe('verification freshness', () => {
    it('should display days since verification', () => {
      const { getByText } = render(<TrustIndicator {...defaultProps} />);
      expect(getByText('30 days ago')).toBeTruthy();
    });

    it('should display "Verified" label', () => {
      const { getByText } = render(<TrustIndicator {...defaultProps} />);
      expect(getByText('Verified')).toBeTruthy();
    });

    it('should display 0 days for fresh verification', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} daysSinceVerification={0} />
      );
      expect(getByText('0 days ago')).toBeTruthy();
    });

    it('should display large number of days', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} daysSinceVerification={365} />
      );
      expect(getByText('365 days ago')).toBeTruthy();
    });
  });

  describe('reference count', () => {
    it('should display reference count with plural', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} referenceCount={5} />
      );
      expect(getByText('5 people')).toBeTruthy();
    });

    it('should display reference count with singular', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} referenceCount={1} />
      );
      expect(getByText('1 person')).toBeTruthy();
    });

    it('should display "References" label', () => {
      const { getByText } = render(<TrustIndicator {...defaultProps} />);
      expect(getByText('References')).toBeTruthy();
    });

    it('should handle zero references', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} referenceCount={0} />
      );
      expect(getByText('0 people')).toBeTruthy();
    });
  });

  describe('response rate', () => {
    it('should display response rate percentage', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} responseRate={95} />
      );
      expect(getByText('95%')).toBeTruthy();
    });

    it('should display "Response Rate" label', () => {
      const { getByText } = render(<TrustIndicator {...defaultProps} />);
      expect(getByText('Response Rate')).toBeTruthy();
    });

    it('should display 0% rate', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} responseRate={0} />
      );
      expect(getByText('0%')).toBeTruthy();
    });

    it('should display 100% rate', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} responseRate={100} />
      );
      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('response rate color coding', () => {
    // These tests verify the color coding but don't check actual styles
    // The component uses colors.success for >= 80, colors.warning for >= 50, colors.error for < 50
    it('should render high response rate (>= 80)', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} responseRate={80} />
      );
      expect(getByText('80%')).toBeTruthy();
    });

    it('should render medium response rate (50-79)', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} responseRate={65} />
      );
      expect(getByText('65%')).toBeTruthy();
    });

    it('should render low response rate (< 50)', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} responseRate={30} />
      );
      expect(getByText('30%')).toBeTruthy();
    });

    it('should handle boundary at 80', () => {
      const { getByText: getByText79 } = render(
        <TrustIndicator {...defaultProps} responseRate={79} />
      );
      expect(getByText79('79%')).toBeTruthy();

      const { getByText: getByText80 } = render(
        <TrustIndicator {...defaultProps} responseRate={80} />
      );
      expect(getByText80('80%')).toBeTruthy();
    });

    it('should handle boundary at 50', () => {
      const { getByText: getByText49 } = render(
        <TrustIndicator {...defaultProps} responseRate={49} />
      );
      expect(getByText49('49%')).toBeTruthy();

      const { getByText: getByText50 } = render(
        <TrustIndicator {...defaultProps} responseRate={50} />
      );
      expect(getByText50('50%')).toBeTruthy();
    });
  });

  describe('account age formatting', () => {
    it('should display days for accounts < 30 days', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={15} />
      );
      expect(getByText('15 days')).toBeTruthy();
    });

    it('should display months for accounts >= 30 days and < 365 days', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={60} />
      );
      expect(getByText('2 months')).toBeTruthy();
    });

    it('should display singular month', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={30} />
      );
      expect(getByText('1 month')).toBeTruthy();
    });

    it('should display years for accounts >= 365 days', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={365} />
      );
      expect(getByText('1 year')).toBeTruthy();
    });

    it('should display plural years', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={730} />
      );
      expect(getByText('2 years')).toBeTruthy();
    });

    it('should display "Member For" label', () => {
      const { getByText } = render(<TrustIndicator {...defaultProps} />);
      expect(getByText('Member For')).toBeTruthy();
    });

    it('should handle 0 days', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={0} />
      );
      expect(getByText('0 days')).toBeTruthy();
    });
  });

  describe('account age boundary conditions', () => {
    it('should show days at 29', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={29} />
      );
      expect(getByText('29 days')).toBeTruthy();
    });

    it('should show months at 30', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={30} />
      );
      expect(getByText('1 month')).toBeTruthy();
    });

    it('should show months at 364', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={364} />
      );
      expect(getByText('12 months')).toBeTruthy();
    });

    it('should show years at 365', () => {
      const { getByText } = render(
        <TrustIndicator {...defaultProps} accountAgeDays={365} />
      );
      expect(getByText('1 year')).toBeTruthy();
    });
  });

  describe('icons', () => {
    it('should render shield-check icon for verification', () => {
      const { getByTestId } = render(<TrustIndicator {...defaultProps} />);
      expect(getByTestId('icon-shield-check')).toBeTruthy();
    });

    it('should render account-group icon for references', () => {
      const { getByTestId } = render(<TrustIndicator {...defaultProps} />);
      expect(getByTestId('icon-account-group')).toBeTruthy();
    });

    it('should render message-reply-text icon for response rate', () => {
      const { getByTestId } = render(<TrustIndicator {...defaultProps} />);
      expect(getByTestId('icon-message-reply-text')).toBeTruthy();
    });

    it('should render calendar-check icon for account age', () => {
      const { getByTestId } = render(<TrustIndicator {...defaultProps} />);
      expect(getByTestId('icon-calendar-check')).toBeTruthy();
    });
  });

  describe('all metrics rendered', () => {
    it('should display all four trust metrics', () => {
      const { getByText } = render(<TrustIndicator {...defaultProps} />);

      // All labels present
      expect(getByText('Verified')).toBeTruthy();
      expect(getByText('References')).toBeTruthy();
      expect(getByText('Response Rate')).toBeTruthy();
      expect(getByText('Member For')).toBeTruthy();

      // All values present
      expect(getByText('30 days ago')).toBeTruthy();
      expect(getByText('5 people')).toBeTruthy();
      expect(getByText('95%')).toBeTruthy();
      expect(getByText('6 months')).toBeTruthy();
    });
  });
});
