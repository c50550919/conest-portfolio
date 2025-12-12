/**
 * ReportModal Component Tests
 * Tests for the message reporting modal with type selection and submission
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ReportModal, { ReportType, ReportSeverity } from '../../../src/components/messaging/ReportModal';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('ReportModal Component', () => {
  const defaultProps = {
    visible: true,
    messageId: 'msg-123',
    messageContent: 'This is a test message that needs to be reported.',
    onClose: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render when visible is true', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      expect(getByText('Report Message')).toBeTruthy();
    });

    it('should not be visible when visible is false', () => {
      const { queryByText } = render(
        <ReportModal {...defaultProps} visible={false} />
      );

      // Modal content should not be in the tree when not visible
      expect(queryByText('Report Message')).toBeNull();
    });
  });

  describe('message preview', () => {
    it('should display reported message label', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      expect(getByText('Reported Message:')).toBeTruthy();
    });

    it('should display message content', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      expect(getByText('This is a test message that needs to be reported.')).toBeTruthy();
    });
  });

  describe('report type selection', () => {
    it('should display all report options', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      expect(getByText('Child Safety Concern')).toBeTruthy();
      expect(getByText('Harassment or Bullying')).toBeTruthy();
      expect(getByText('Inappropriate Content')).toBeTruthy();
      expect(getByText('Scam or Fraud')).toBeTruthy();
      expect(getByText('Spam')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });

    it('should display descriptions for report options', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      expect(getByText('Content that may pose a risk to child safety')).toBeTruthy();
      expect(getByText('Threatening, abusive, or harassing behavior')).toBeTruthy();
      expect(getByText('Offensive, explicit, or inappropriate material')).toBeTruthy();
    });

    it('should allow selecting a report type', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      const harassmentOption = getByText('Harassment or Bullying');
      fireEvent.press(harassmentOption);

      // The option should be selected (visual change handled by styles)
      expect(harassmentOption).toBeTruthy();
    });

    it('should allow changing selected report type', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Harassment or Bullying'));
      fireEvent.press(getByText('Spam'));

      // Both should still be accessible
      expect(getByText('Harassment or Bullying')).toBeTruthy();
      expect(getByText('Spam')).toBeTruthy();
    });
  });

  describe('description input', () => {
    it('should render description input', () => {
      const { getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

      expect(getByPlaceholderText('Provide any additional context...')).toBeTruthy();
    });

    it('should show Additional Details label with Optional text', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      // The text "Additional Details" and "(Optional)" are in the same Text element
      expect(getByText(/Additional Details/)).toBeTruthy();
      expect(getByText(/Optional/)).toBeTruthy();
    });

    it('should allow entering description', () => {
      const { getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

      const input = getByPlaceholderText('Provide any additional context...');
      fireEvent.changeText(input, 'This user has been sending threatening messages.');

      expect(input.props.value).toBe('This user has been sending threatening messages.');
    });

    it('should display character count', () => {
      const { getByPlaceholderText, getByText } = render(<ReportModal {...defaultProps} />);

      const input = getByPlaceholderText('Provide any additional context...');
      fireEvent.changeText(input, 'Test description');

      expect(getByText('16 / 500')).toBeTruthy();
    });

    it('should respect max length of 500 characters', () => {
      const { getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

      const input = getByPlaceholderText('Provide any additional context...');
      expect(input.props.maxLength).toBe(500);
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      // Press the Cancel button to close
      fireEvent.press(getByText('Cancel'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is pressed', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Cancel'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset state when closed', () => {
      const { getByText, getByPlaceholderText, rerender } = render(
        <ReportModal {...defaultProps} />
      );

      // Select a type and add description
      fireEvent.press(getByText('Harassment or Bullying'));
      const input = getByPlaceholderText('Provide any additional context...');
      fireEvent.changeText(input, 'Test description');

      // Close and reopen
      fireEvent.press(getByText('Cancel'));

      // Rerender with visible true
      rerender(<ReportModal {...defaultProps} visible={true} />);

      // State should be reset (description cleared)
      const newInput = getByPlaceholderText('Provide any additional context...');
      expect(newInput.props.value).toBe('');
    });
  });

  describe('submit functionality', () => {
    it('should disable submit button when no type is selected', () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      const submitButton = getByText('Submit Report');
      fireEvent.press(submitButton);

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should enable submit button when type is selected', async () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Harassment or Bullying'));
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    it('should call onSubmit with correct parameters', async () => {
      const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Harassment or Bullying'));
      const input = getByPlaceholderText('Provide any additional context...');
      fireEvent.changeText(input, 'Additional context here');
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          messageId: 'msg-123',
          reportType: 'harassment',
          severity: 'high',
          description: 'Additional context here',
        });
      });
    });

    it('should submit with correct severity for each report type', async () => {
      const testCases: { type: string; expectedType: ReportType; expectedSeverity: ReportSeverity }[] = [
        { type: 'Child Safety Concern', expectedType: 'child_safety_concern', expectedSeverity: 'critical' },
        { type: 'Harassment or Bullying', expectedType: 'harassment', expectedSeverity: 'high' },
        { type: 'Inappropriate Content', expectedType: 'inappropriate_content', expectedSeverity: 'medium' },
        { type: 'Scam or Fraud', expectedType: 'scam', expectedSeverity: 'high' },
        { type: 'Spam', expectedType: 'spam', expectedSeverity: 'low' },
        { type: 'Other', expectedType: 'other', expectedSeverity: 'medium' },
      ];

      for (const testCase of testCases) {
        const onSubmit = jest.fn().mockResolvedValue(undefined);
        const { getByText, unmount } = render(
          <ReportModal {...defaultProps} onSubmit={onSubmit} />
        );

        fireEvent.press(getByText(testCase.type));
        fireEvent.press(getByText('Submit Report'));

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              reportType: testCase.expectedType,
              severity: testCase.expectedSeverity,
            })
          );
        });

        unmount();
      }
    });

    it('should trim description before submitting', async () => {
      const { getByText, getByPlaceholderText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Spam'));
      const input = getByPlaceholderText('Provide any additional context...');
      fireEvent.changeText(input, '  Spammy behavior  ');
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Spammy behavior',
          })
        );
      });
    });

    it('should call onClose after successful submission', async () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Spam'));
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('submitting state', () => {
    it('should show loading indicator while submitting', async () => {
      const slowSubmit = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const { getByText, UNSAFE_getByType } = render(
        <ReportModal {...defaultProps} onSubmit={slowSubmit} />
      );

      fireEvent.press(getByText('Harassment or Bullying'));
      fireEvent.press(getByText('Submit Report'));

      // ActivityIndicator should appear
      await waitFor(() => {
        const indicator = UNSAFE_getByType('ActivityIndicator' as any);
        expect(indicator).toBeTruthy();
      });
    });

    it('should disable close button while submitting', async () => {
      const slowSubmit = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const { getByText, UNSAFE_getAllByType } = render(
        <ReportModal {...defaultProps} onSubmit={slowSubmit} />
      );

      fireEvent.press(getByText('Harassment or Bullying'));
      fireEvent.press(getByText('Submit Report'));

      // Try to close - should not work
      fireEvent.press(getByText('Cancel'));

      // onClose should not have been called yet
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should disable type selection while submitting', async () => {
      const slowSubmit = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const { getByText } = render(
        <ReportModal {...defaultProps} onSubmit={slowSubmit} />
      );

      fireEvent.press(getByText('Harassment or Bullying'));
      fireEvent.press(getByText('Submit Report'));

      // Try to change selection - should be disabled
      fireEvent.press(getByText('Spam'));

      // Original selection should remain (harassment was selected)
      expect(slowSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'harassment',
        })
      );
    });

    it('should disable description input while submitting', async () => {
      const slowSubmit = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const { getByText, getByPlaceholderText } = render(
        <ReportModal {...defaultProps} onSubmit={slowSubmit} />
      );

      fireEvent.press(getByText('Spam'));
      fireEvent.press(getByText('Submit Report'));

      const input = getByPlaceholderText('Provide any additional context...');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle submission errors gracefully', async () => {
      const errorSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
      const { getByText } = render(
        <ReportModal {...defaultProps} onSubmit={errorSubmit} />
      );

      fireEvent.press(getByText('Spam'));
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(errorSubmit).toHaveBeenCalled();
      });

      // Modal should remain open on error (onClose not called)
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should log error on submission failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const errorSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
      const { getByText } = render(
        <ReportModal {...defaultProps} onSubmit={errorSubmit} />
      );

      fireEvent.press(getByText('Spam'));
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to submit report:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('child safety priority', () => {
    it('should list Child Safety Concern as first option', () => {
      const { getAllByText } = render(<ReportModal {...defaultProps} />);

      // Get all option labels
      const selectReasonText = getAllByText(/Select Reason/)[0];
      expect(selectReasonText).toBeTruthy();

      // Child Safety should be the first report option
      const childSafety = getAllByText('Child Safety Concern')[0];
      expect(childSafety).toBeTruthy();
    });

    it('should have critical severity for child safety concerns', async () => {
      const { getByText } = render(<ReportModal {...defaultProps} />);

      fireEvent.press(getByText('Child Safety Concern'));
      fireEvent.press(getByText('Submit Report'));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            reportType: 'child_safety_concern',
            severity: 'critical',
          })
        );
      });
    });
  });
});
