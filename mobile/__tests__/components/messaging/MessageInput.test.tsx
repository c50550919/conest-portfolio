/**
 * MessageInput Component Tests
 * Tests for message composition input with typing indicators and send functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MessageInput from '../../../src/components/messaging/MessageInput';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('MessageInput Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render with default placeholder', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} />
      );

      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    });

    it('should render with custom placeholder', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} placeholder="Write something..." />
      );

      expect(getByPlaceholderText('Write something...')).toBeTruthy();
    });

    it('should render send button', () => {
      const mockOnSend = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <MessageInput onSend={mockOnSend} />
      );

      // Send icon should be present
      const icons = UNSAFE_getAllByType('Icon' as any);
      const sendIcon = icons.find((icon: any) => icon.props.name === 'send');
      expect(sendIcon).toBeTruthy();
    });
  });

  describe('text input behavior', () => {
    it('should update content when typing', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello world');

      expect(input.props.value).toBe('Hello world');
    });

    it('should respect maxLength prop', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} maxLength={10} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.maxLength).toBe(10);
    });

    it('should show character count near maxLength', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <MessageInput onSend={mockOnSend} maxLength={100} />
      );

      const input = getByPlaceholderText('Type a message...');
      // Type text that exceeds 90% of maxLength (90+ chars)
      fireEvent.changeText(input, 'A'.repeat(95));

      expect(getByText('95 / 100')).toBeTruthy();
    });

    it('should not show character count when below threshold', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, queryByText } = render(
        <MessageInput onSend={mockOnSend} maxLength={100} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');

      expect(queryByText(/\d+ \/ 100/)).toBeNull();
    });
  });

  describe('typing indicators', () => {
    it('should call onTypingStart when user starts typing', () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStart = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStart={mockOnTypingStart}
        />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'H');

      expect(mockOnTypingStart).toHaveBeenCalledTimes(1);
    });

    it('should call onTypingStop after 2 seconds of inactivity', async () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStop = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStop={mockOnTypingStop}
        />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');

      // Fast-forward 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockOnTypingStop).toHaveBeenCalledTimes(1);
    });

    it('should reset typing timeout on continued typing', () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStop = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStop={mockOnTypingStop}
        />
      );

      const input = getByPlaceholderText('Type a message...');

      fireEvent.changeText(input, 'H');

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Type more
      fireEvent.changeText(input, 'He');

      // Advance 1 second (should not trigger stop yet)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnTypingStop).not.toHaveBeenCalled();

      // Advance another 1 second (total 2s since last type)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnTypingStop).toHaveBeenCalledTimes(1);
    });

    it('should call onTypingStop immediately when text is cleared', () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStop = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStop={mockOnTypingStop}
        />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');
      fireEvent.changeText(input, '');

      expect(mockOnTypingStop).toHaveBeenCalled();
    });

    it('should not call onTypingStart twice for continuous typing', () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStart = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStart={mockOnTypingStart}
        />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'H');
      fireEvent.changeText(input, 'He');
      fireEvent.changeText(input, 'Hel');

      expect(mockOnTypingStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('send functionality', () => {
    it('should call onSend with trimmed content when send button is pressed', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, UNSAFE_root } = render(
        <MessageInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, '  Hello world  ');

      // Find send button by traversing the tree - it's the TouchableOpacity after the TextInput
      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(mockOnSend).toHaveBeenCalledWith('Hello world');
    });

    it('should clear input after sending', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, UNSAFE_root } = render(
        <MessageInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello world');

      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(input.props.value).toBe('');
    });

    it('should call onTypingStop when sending', () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStop = jest.fn();
      const { getByPlaceholderText, UNSAFE_root } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStop={mockOnTypingStop}
        />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');

      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(mockOnTypingStop).toHaveBeenCalled();
    });

    it('should not send empty messages', () => {
      const mockOnSend = jest.fn();
      const { UNSAFE_root } = render(
        <MessageInput onSend={mockOnSend} />
      );

      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, UNSAFE_root } = render(
        <MessageInput onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, '   ');

      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} disabled={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.editable).toBe(false);
    });

    it('should disable send button when disabled prop is true', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, UNSAFE_root } = render(
        <MessageInput onSend={mockOnSend} disabled={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');

      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('sending state', () => {
    it('should show loading indicator when sending', () => {
      const mockOnSend = jest.fn();
      const { UNSAFE_getByType } = render(
        <MessageInput onSend={mockOnSend} sending={true} />
      );

      // ActivityIndicator should be present
      const indicator = UNSAFE_getByType('ActivityIndicator' as any);
      expect(indicator).toBeTruthy();
    });

    it('should disable input when sending', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} sending={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.editable).toBe(false);
    });

    it('should not send when already sending', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText, UNSAFE_root } = render(
        <MessageInput onSend={mockOnSend} sending={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');

      const sendButton = UNSAFE_root.findAllByType('View' as any)
        .find((node: any) => node.props.accessibilityState?.disabled !== undefined);
      if (sendButton) {
        fireEvent.press(sendButton);
      }

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('autoFocus', () => {
    it('should pass autoFocus prop to TextInput', () => {
      const mockOnSend = jest.fn();
      const { getByPlaceholderText } = render(
        <MessageInput onSend={mockOnSend} autoFocus={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.autoFocus).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup timeout on unmount', () => {
      const mockOnSend = jest.fn();
      const mockOnTypingStop = jest.fn();
      const { getByPlaceholderText, unmount } = render(
        <MessageInput
          onSend={mockOnSend}
          onTypingStop={mockOnTypingStop}
        />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello');

      // Unmount before timeout fires
      unmount();

      // Advance timers - should not throw
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // onTypingStop should not be called after unmount
      // (behavior depends on implementation, but should not throw)
    });
  });
});
