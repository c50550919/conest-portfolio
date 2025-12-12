import { MessageModel } from '../models/Message';
import { MatchModel } from '../models/Match';
import logger from '../config/logger';

// Placeholder for encryption - in production use crypto library
const encryptMessage = (content: string): string => 
  // PLACEHOLDER: In production, implement proper end-to-end encryption
  // For now, just return the content as-is
  Buffer.from(content).toString('base64')
;

const decryptMessage = (encrypted: string): string => 
  // PLACEHOLDER: In production, implement proper decryption
  Buffer.from(encrypted, 'base64').toString('utf-8')
;

export const MessagingService = {
  // Send a message
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string,
  ): Promise<any> {
    // Verify users have an active match
    const match = await MatchModel.findExistingMatch(senderId, recipientId);
    if (!match || match.status !== 'accepted') {
      throw new Error('Cannot message users without an accepted match');
    }

    // Get or create conversation
    let conversation = await MessageModel.findConversation(senderId, recipientId);
    if (!conversation) {
      conversation = await MessageModel.createConversation(senderId, recipientId);
    }

    // Encrypt message content
    const encryptedContent = encryptMessage(content);

    // Create message
    const message = await MessageModel.createMessage({
      conversation_id: conversation.id,
      sender_id: senderId,
      content: encryptedContent,
      message_type: messageType,
      file_url: fileUrl,
    });

    logger.info(`Message sent from ${senderId} to ${recipientId}`);

    // Return message with decrypted content for immediate display
    return {
      ...message,
      content: content, // Return original content for sender
    };
  },

  // Get conversation between two users
  async getConversation(userId: string, otherUserId: string, limit: number = 50): Promise<any> {
    const conversation = await MessageModel.findConversation(userId, otherUserId);
    if (!conversation) {
      return {
        conversation: null,
        messages: [],
      };
    }

    // Get messages
    let messages = await MessageModel.getConversationMessages(conversation.id, limit);

    // Decrypt messages
    messages = messages.map(msg => ({
      ...msg,
      content: decryptMessage(msg.content),
    }));

    return {
      conversation,
      messages: messages.reverse(), // Return in chronological order
    };
  },

  // Get all conversations for a user
  async getUserConversations(userId: string): Promise<any[]> {
    const conversations = await MessageModel.getUserConversations(userId);

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await MessageModel.getConversationMessages(conv.id, 1);
        const lastMessage = messages[0];

        // Get other participant ID
        const otherParticipantId =
          conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;

        return {
          ...conv,
          otherParticipantId,
          lastMessage: lastMessage ? {
            ...lastMessage,
            content: decryptMessage(lastMessage.content),
          } : null,
        };
      }),
    );

    return conversationsWithMessages;
  },

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await MessageModel.markConversationAsRead(conversationId, userId);
    logger.info(`Conversation ${conversationId} marked as read by user ${userId}`);
  },

  // Delete a message
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // Verify message belongs to user
    const messages = await MessageModel.getConversationMessages('', 1);
    const message = messages.find(m => m.id === messageId);

    if (!message || message.sender_id !== userId) {
      throw new Error('Unauthorized to delete this message');
    }

    await MessageModel.deleteMessage(messageId);
    logger.info(`Message ${messageId} deleted by user ${userId}`);
  },

  // Get unread message count
  async getUnreadCount(userId: string): Promise<number> {
    return await MessageModel.getUnreadCount(userId);
  },

  // Handle real-time message delivery via Socket.io (called from websocket handler)
  async handleRealtimeMessage(io: any, senderId: string, recipientId: string, message: any): Promise<void> {
    // Emit message to recipient's socket room
    io.to(`user:${recipientId}`).emit('new_message', {
      ...message,
      content: decryptMessage(message.content),
    });

    // Emit delivery confirmation to sender
    io.to(`user:${senderId}`).emit('message_delivered', {
      messageId: message.id,
      timestamp: message.created_at,
    });

    logger.info(`Real-time message delivered from ${senderId} to ${recipientId}`);
  },
};
