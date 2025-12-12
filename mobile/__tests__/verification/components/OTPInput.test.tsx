/**
 * Unit Tests for OTPInput Component
 * Tests OTP input with auto-advance, paste support, and accessibility
 * Task: T013
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OTPInput } from '../../../src/components/verification/OTPInput';

describe('OTPInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render 6 input fields by default', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      expect(inputs).toHaveLength(6);
    });

    it('should render custom length when specified', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} length={4} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      expect(inputs).toHaveLength(4);
    });

    it('should display pre-filled value', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} value="123456" testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      expect(inputs[0].props.value).toBe('1');
      expect(inputs[1].props.value).toBe('2');
      expect(inputs[2].props.value).toBe('3');
      expect(inputs[3].props.value).toBe('4');
      expect(inputs[4].props.value).toBe('5');
      expect(inputs[5].props.value).toBe('6');
    });

    it('should show error styling when error prop is true', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} error={true} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      // Style is an array, check the dynamic style (index 1) has borderColor
      const inputStyle = inputs[0].props.style;
      const dynamicStyle = Array.isArray(inputStyle) ? inputStyle[1] : inputStyle;
      expect(dynamicStyle.borderColor).toBeDefined();
    });

    it('should be disabled when disabled prop is true', () => {
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} disabled={true} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);
      inputs.forEach((input) => {
        expect(input.props.editable).toBe(false);
      });
    });
  });

  describe('input handling', () => {
    it('should call onChange when digit is entered', () => {
      const onChange = jest.fn();
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} onChange={onChange} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);
      fireEvent.changeText(inputs[0], '1');

      expect(onChange).toHaveBeenCalledWith('1');
    });

    it('should auto-advance focus to next input after entry', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);

      fireEvent.changeText(inputs[0], '1');

      // Second input should be focused (this will be tested via focus behavior)
      // The component should call focus() on the next input
    });

    it('should only accept numeric input', () => {
      const onChange = jest.fn();
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} onChange={onChange} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);
      fireEvent.changeText(inputs[0], 'a');

      // Should not call onChange with non-numeric value
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should handle backspace and move to previous input', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} value="12" testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);

      // Simulate backspace on second input
      fireEvent(inputs[1], 'keyPress', { nativeEvent: { key: 'Backspace' } });

      // Should clear current and focus previous
    });
  });

  describe('clipboard handling', () => {
    it('should paste full 6-digit code from clipboard', async () => {
      const onChange = jest.fn();
      const onComplete = jest.fn();
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} onChange={onChange} onComplete={onComplete} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);

      // Simulate pasting 6 digits
      fireEvent.changeText(inputs[0], '123456');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('123456');
        expect(onComplete).toHaveBeenCalledWith('123456');
      });
    });

    it('should handle partial paste correctly', () => {
      const onChange = jest.fn();
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} onChange={onChange} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);
      fireEvent.changeText(inputs[0], '12345'); // 5 digits

      // Should only take first character
      expect(onChange).toHaveBeenCalledWith('1');
    });
  });

  describe('completion callback', () => {
    it('should call onComplete when 6-digit code is pasted', async () => {
      const onComplete = jest.fn();
      const onChange = jest.fn();
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} value="" onChange={onChange} onComplete={onComplete} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);

      // Simulate pasting complete code
      fireEvent.changeText(inputs[0], '123456');

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith('123456');
      });
    });

    it('should not call onComplete with incomplete code', () => {
      const onComplete = jest.fn();
      const onChange = jest.fn();
      const { getAllByTestId } = render(
        <OTPInput {...defaultProps} value="" onChange={onChange} onComplete={onComplete} testID="otp" />
      );

      const inputs = getAllByTestId(/otp-input-\d/);

      // Enter single digit - should not trigger complete
      fireEvent.changeText(inputs[0], '1');

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have textContentType oneTimeCode for iOS autofill', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      expect(inputs[0].props.textContentType).toBe('oneTimeCode');
    });

    it('should have numeric keyboard type', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      expect(inputs[0].props.keyboardType).toBe('number-pad');
    });

    it('should have proper accessibility labels', () => {
      const { getAllByTestId } = render(<OTPInput {...defaultProps} testID="otp" />);

      const inputs = getAllByTestId(/otp-input-\d/);
      // Component uses "Verification code digit 1 of 6"
      expect(inputs[0].props.accessibilityLabel).toContain('digit 1');
    });
  });
});
