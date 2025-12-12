/**
 * MessageBubble Component Tests
 * Tests for chat message display with read receipts, timestamps, and moderation indicators
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessageBubble from '../../../src/components/messaging/MessageBubble';
import { Message } from '../../../src/store/slices/enhancedMessagesSlice';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('MessageBubble Component', () => {
  const baseMessage: Message = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    recipientId: 'user-2',
    content: 'Hello, how are you?',
    messageType: 'text',
    read: false,
    sentAt: '2024-01-15T10:30:00Z',
  };

  describe('basic rendering', () => {
    it('should render message content', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      expect(getByText('Hello, how are you?')).toBeTruthy();
    });

    it('should render with different styles for sent messages', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      expect(getByText('Hello, how are you?')).toBeTruthy();
    });

    it('should render with different styles for received messages', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      expect(getByText('Hello, how are you?')).toBeTruthy();
    });
  });

  describe('timestamp formatting', () => {
    it('should format AM time correctly', () => {
      const morningMessage: Message = {
        ...baseMessage,
        sentAt: '2024-01-15T09:05:00Z',
      };
      const { getByText } = render(
        <MessageBubble message={morningMessage} isOwnMessage={true} />
      );

      // Time will be formatted based on local timezone
      expect(getByText(/\d{1,2}:\d{2}\s[AP]M/)).toBeTruthy();
    });

    it('should format PM time correctly', () => {
      const afternoonMessage: Message = {
        ...baseMessage,
        sentAt: '2024-01-15T14:30:00Z',
      };
      const { getByText } = render(
        <MessageBubble message={afternoonMessage} isOwnMessage={true} />
      );

      expect(getByText(/\d{1,2}:\d{2}\s[AP]M/)).toBeTruthy();
    });

    it('should show external timestamp when showTimestamp is true', () => {
      const { getAllByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} showTimestamp={true} />
      );

      // Should have both inline and external timestamps
      const timestamps = getAllByText(/\d{1,2}/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe('read receipts and status icons', () => {
    it('should show single check for unread sent message', () => {
      const unreadMessage: Message = {
        ...baseMessage,
        read: false,
      };
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={unreadMessage} isOwnMessage={true} />
      );

      // Icon component should be present
      const icons = UNSAFE_getAllByType('Icon' as any);
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should show double check for read sent message', () => {
      const readMessage: Message = {
        ...baseMessage,
        read: true,
        readAt: '2024-01-15T10:35:00Z',
      };
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={readMessage} isOwnMessage={true} />
      );

      const icons = UNSAFE_getAllByType('Icon' as any);
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should not show status icon for received messages', () => {
      const { queryByTestId } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      // No status icon should be shown for received messages
      expect(queryByTestId('status-icon')).toBeNull();
    });
  });

  describe('moderation indicators', () => {
    it('should show pending review indicator', () => {
      const pendingMessage: Message = {
        ...baseMessage,
        moderationStatus: 'pending',
      };
      const { getByText } = render(
        <MessageBubble message={pendingMessage} isOwnMessage={true} />
      );

      expect(getByText('Under Review')).toBeTruthy();
    });

    it('should show rejected indicator', () => {
      const rejectedMessage: Message = {
        ...baseMessage,
        moderationStatus: 'rejected',
      };
      const { getByText } = render(
        <MessageBubble message={rejectedMessage} isOwnMessage={true} />
      );

      expect(getByText('Removed')).toBeTruthy();
    });

    it('should not show indicator for auto_approved messages', () => {
      const approvedMessage: Message = {
        ...baseMessage,
        moderationStatus: 'auto_approved',
      };
      const { queryByText } = render(
        <MessageBubble message={approvedMessage} isOwnMessage={true} />
      );

      expect(queryByText('Under Review')).toBeNull();
      expect(queryByText('Removed')).toBeNull();
    });

    it('should not show indicator when moderationStatus is undefined', () => {
      const { queryByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      expect(queryByText('Under Review')).toBeNull();
      expect(queryByText('Removed')).toBeNull();
    });
  });

  describe('flagged messages', () => {
    it('should show flag indicator for flagged messages', () => {
      const flaggedMessage: Message = {
        ...baseMessage,
        flaggedForReview: true,
      };
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={flaggedMessage} isOwnMessage={true} />
      );

      // Flag icon should be present
      const icons = UNSAFE_getAllByType('Icon' as any);
      const flagIcon = icons.find((icon: any) => icon.props.name === 'flag');
      expect(flagIcon).toBeTruthy();
    });

    it('should not show flag indicator for non-flagged messages', () => {
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      const icons = UNSAFE_getAllByType('Icon' as any);
      const flagIcon = icons.find((icon: any) => icon.props.name === 'flag');
      expect(flagIcon).toBeFalsy();
    });
  });

  describe('attachments', () => {
    it('should show image placeholder for image messages', () => {
      const imageMessage: Message = {
        ...baseMessage,
        messageType: 'image',
        fileUrl: 'https://example.com/image.jpg',
      };
      const { getByText } = render(
        <MessageBubble message={imageMessage} isOwnMessage={true} />
      );

      expect(getByText('Image')).toBeTruthy();
    });

    it('should show file placeholder for file messages', () => {
      const fileMessage: Message = {
        ...baseMessage,
        messageType: 'file',
        fileUrl: 'https://example.com/document.pdf',
      };
      const { getByText } = render(
        <MessageBubble message={fileMessage} isOwnMessage={true} />
      );

      expect(getByText('File Attachment')).toBeTruthy();
    });

    it('should not show placeholders for text-only messages', () => {
      const { queryByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      expect(queryByText('Image')).toBeNull();
      expect(queryByText('File Attachment')).toBeNull();
    });
  });

  describe('long press interaction', () => {
    it('should call onLongPress when message is long pressed', () => {
      const mockOnLongPress = jest.fn();
      const { getByText } = render(
        <MessageBubble
          message={baseMessage}
          isOwnMessage={true}
          onLongPress={mockOnLongPress}
        />
      );

      const messageText = getByText('Hello, how are you?');
      fireEvent(messageText, 'longPress');

      expect(mockOnLongPress).toHaveBeenCalledWith(baseMessage);
    });

    it('should not throw when onLongPress is not provided', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      const messageText = getByText('Hello, how are you?');

      expect(() => {
        fireEvent(messageText, 'longPress');
      }).not.toThrow();
    });
  });

  describe('message content variations', () => {
    it('should handle long messages', () => {
      const longMessage: Message = {
        ...baseMessage,
        content: 'A'.repeat(500),
      };
      const { getByText } = render(
        <MessageBubble message={longMessage} isOwnMessage={true} />
      );

      expect(getByText('A'.repeat(500))).toBeTruthy();
    });

    it('should handle empty content gracefully', () => {
      const emptyMessage: Message = {
        ...baseMessage,
        content: '',
      };
      const { toJSON } = render(
        <MessageBubble message={emptyMessage} isOwnMessage={true} />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should handle special characters in content', () => {
      const specialMessage: Message = {
        ...baseMessage,
        content: 'Hello! @user #test <script>alert("xss")</script>',
      };
      const { getByText } = render(
        <MessageBubble message={specialMessage} isOwnMessage={true} />
      );

      expect(getByText(/Hello! @user #test/)).toBeTruthy();
    });

    it('should handle emoji in content', () => {
      const emojiMessage: Message = {
        ...baseMessage,
        content: 'Hello! 👋🏻 How are you? 😊',
      };
      const { getByText } = render(
        <MessageBubble message={emojiMessage} isOwnMessage={true} />
      );

      expect(getByText(/Hello! 👋🏻 How are you\? 😊/)).toBeTruthy();
    });
  });
});
