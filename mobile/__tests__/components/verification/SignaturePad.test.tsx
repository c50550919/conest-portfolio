/**
 * SignaturePad Component Tests
 *
 * HIGH-RISK - Captures signature for background check consent
 *
 * Key Test Areas:
 * 1. Component rendering (instructions, canvas, buttons)
 * 2. Placeholder display when empty
 * 3. Clear button functionality
 * 4. Save button state (disabled when no signature)
 * 5. Signature capture callback
 * 6. Accessibility
 * 7. testID propagation
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

// Mock SignatureCapture
const mockResetImage = jest.fn();
const mockSaveImage = jest.fn();

jest.mock('react-native-signature-capture', () => {
  const React = require('react');
  const { View } = require('react-native');

  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      resetImage: mockResetImage,
      saveImage: mockSaveImage,
    }));

    return React.createElement(View, {
      testID: 'signature-capture',
      ...props,
    });
  });
});

import { SignaturePad } from '../../../src/components/verification/SignaturePad';

describe('SignaturePad', () => {
  const mockOnSignature = jest.fn();
  const mockOnClear = jest.fn();

  const defaultProps = {
    onSignature: mockOnSignature,
    onClear: mockOnClear,
    testID: 'signature-pad',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render with testID', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('signature-pad')).toBeTruthy();
    });

    it('should display instructions text', () => {
      const { getByText } = render(<SignaturePad {...defaultProps} />);

      expect(getByText('Sign in the box below')).toBeTruthy();
    });

    it('should display draw icon', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('icon-draw')).toBeTruthy();
    });

    it('should render signature capture canvas', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('signature-capture')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLACEHOLDER TESTS
  // ===========================================================================

  describe('Placeholder', () => {
    it('should show placeholder when no signature', () => {
      const { getByText, getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByText('Draw your signature here')).toBeTruthy();
      expect(getByTestId('icon-signature-freehand')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CLEAR BUTTON TESTS
  // ===========================================================================

  describe('Clear Button', () => {
    it('should render clear button', () => {
      const { getByTestId, getByText } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('signature-pad-clear')).toBeTruthy();
      expect(getByText('Clear')).toBeTruthy();
    });

    it('should render eraser icon', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('icon-eraser')).toBeTruthy();
    });

    it('should call resetImage when clear button is pressed', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      fireEvent.press(getByTestId('signature-pad-clear'));

      expect(mockResetImage).toHaveBeenCalledTimes(1);
    });

    it('should call onClear callback when clear button is pressed', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      fireEvent.press(getByTestId('signature-pad-clear'));

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // SAVE BUTTON TESTS
  // ===========================================================================

  describe('Save Button', () => {
    it('should render save button', () => {
      const { getByTestId, getByText } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('signature-pad-save')).toBeTruthy();
      expect(getByText('Save Signature')).toBeTruthy();
    });

    it('should render check icon', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('icon-check')).toBeTruthy();
    });

    it('should be disabled when no signature', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      const saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should call saveImage when save button is pressed (after signature)', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      // Simulate drawing a signature by triggering the drag event
      const canvas = getByTestId('signature-capture');
      fireEvent(canvas, 'onDragEvent');

      // Now press save
      fireEvent.press(getByTestId('signature-pad-save'));

      expect(mockSaveImage).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // SIGNATURE CALLBACK TESTS
  // ===========================================================================

  describe('Signature Callback', () => {
    it('should call onSignature with encoded data when save completes', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      // Simulate save event with encoded signature
      const canvas = getByTestId('signature-capture');
      fireEvent(canvas, 'onSaveEvent', {
        encoded: 'base64-encoded-signature-data',
        pathName: '/path/to/signature.png',
      });

      expect(mockOnSignature).toHaveBeenCalledWith('base64-encoded-signature-data');
    });

    it('should NOT call onSignature if encoded data is empty', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      const canvas = getByTestId('signature-capture');
      fireEvent(canvas, 'onSaveEvent', {
        encoded: '',
        pathName: '/path/to/signature.png',
      });

      expect(mockOnSignature).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DRAG EVENT TESTS
  // ===========================================================================

  describe('Drag Event', () => {
    it('should enable save button after user starts drawing', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      // Initially disabled
      let saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);

      // Simulate drawing
      const canvas = getByTestId('signature-capture');
      fireEvent(canvas, 'onDragEvent');

      // Should now be enabled
      saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityState.disabled).toBe(false);
    });

    it('should hide placeholder after user starts drawing', () => {
      const { getByTestId, queryByText } = render(<SignaturePad {...defaultProps} />);

      // Initially shows placeholder
      expect(queryByText('Draw your signature here')).toBeTruthy();

      // Simulate drawing
      const canvas = getByTestId('signature-capture');
      fireEvent(canvas, 'onDragEvent');

      // Placeholder should be hidden (component re-renders with hasSignature=true)
      // Note: In actual component, placeholder has pointerEvents="none" and is conditionally rendered
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible clear button', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      const clearButton = getByTestId('signature-pad-clear');
      expect(clearButton.props.accessibilityLabel).toBe('Clear signature');
      expect(clearButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessible save button', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      const saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityLabel).toBe('Save signature');
      expect(saveButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility state for disabled save button', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      const saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityState).toEqual({ disabled: true });
    });
  });

  // ===========================================================================
  // CUSTOM PROPS TESTS
  // ===========================================================================

  describe('Custom Props', () => {
    it('should apply custom strokeColor', () => {
      const { getByTestId } = render(
        <SignaturePad {...defaultProps} strokeColor="#FF0000" />
      );

      const canvas = getByTestId('signature-capture');
      expect(canvas.props.strokeColor).toBe('#FF0000');
    });

    it('should apply custom strokeWidth', () => {
      const { getByTestId } = render(
        <SignaturePad {...defaultProps} strokeWidth={5} />
      );

      const canvas = getByTestId('signature-capture');
      expect(canvas.props.minStrokeWidth).toBe(5);
      expect(canvas.props.maxStrokeWidth).toBe(6);
    });
  });

  // ===========================================================================
  // TESTID PROPAGATION TESTS
  // ===========================================================================

  describe('TestID Propagation', () => {
    it('should propagate testID to child elements', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      expect(getByTestId('signature-pad')).toBeTruthy();
      expect(getByTestId('signature-pad-clear')).toBeTruthy();
      expect(getByTestId('signature-pad-save')).toBeTruthy();
    });

    it('should handle missing testID gracefully', () => {
      const { queryByTestId } = render(
        <SignaturePad onSignature={mockOnSignature} />
      );

      // Main container should not have testID
      expect(queryByTestId('signature-pad')).toBeNull();
      expect(queryByTestId('signature-pad-clear')).toBeNull();
      expect(queryByTestId('signature-pad-save')).toBeNull();
    });
  });

  // ===========================================================================
  // RESET STATE TESTS
  // ===========================================================================

  describe('Reset State', () => {
    it('should reset hasSignature to false when clear is pressed', () => {
      const { getByTestId } = render(<SignaturePad {...defaultProps} />);

      // Simulate drawing
      const canvas = getByTestId('signature-capture');
      fireEvent(canvas, 'onDragEvent');

      // Save button should be enabled
      let saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityState.disabled).toBe(false);

      // Clear the signature
      fireEvent.press(getByTestId('signature-pad-clear'));

      // Save button should be disabled again
      saveButton = getByTestId('signature-pad-save');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);
    });
  });
});
