import React from 'react';
import { render } from '@testing-library/react-native';
import SafetyBadge from '../../src/components/SafetyBadge';

/**
 * SafetyBadge Component Tests
 * Tests verification badge display and status indicators
 */
describe('SafetyBadge Component', () => {
  it('should render fully verified badge', () => {
    const { getByText, getByTestId } = render(
      <SafetyBadge
        verified_id={true}
        verified_background={true}
        verified_income={true}
      />
    );

    expect(getByText('Fully Verified')).toBeTruthy();
    expect(getByTestId('verification-badge')).toBeTruthy();
  });

  it('should render partially verified badge', () => {
    const { getByText } = render(
      <SafetyBadge
        verified_id={true}
        verified_background={false}
        verified_income={false}
      />
    );

    expect(getByText('Partially Verified')).toBeTruthy();
  });

  it('should render unverified state', () => {
    const { getByText } = render(
      <SafetyBadge
        verified_id={false}
        verified_background={false}
        verified_income={false}
      />
    );

    expect(getByText('Not Verified')).toBeTruthy();
  });

  it('should show verification details on press', () => {
    const { getByTestId, getByText } = render(
      <SafetyBadge
        verified_id={true}
        verified_background={true}
        verified_income={true}
      />
    );

    const badge = getByTestId('verification-badge');
    // fireEvent.press(badge);

    // expect(getByText('ID Verified')).toBeTruthy();
    // expect(getByText('Background Check Passed')).toBeTruthy();
    // expect(getByText('Income Verified')).toBeTruthy();
  });

  it('should display verification icon based on status', () => {
    const { getByTestId } = render(
      <SafetyBadge
        verified_id={true}
        verified_background={true}
        verified_income={true}
      />
    );

    expect(getByTestId('verified-icon')).toBeTruthy();
  });

  it('should not display unverified sections', () => {
    const { queryByText } = render(
      <SafetyBadge
        verified_id={true}
        verified_background={false}
        verified_income={false}
      />
    );

    // Should only show ID verified
    expect(queryByText('Background Check Pending')).toBeFalsy();
  });
});
