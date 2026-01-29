import db from '../config/database';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string; // Encrypted content
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  read: boolean;
  read_at?: Date;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageData {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
  file_url?: string;
}

export const MessageModel = {
  async createConversation(participant1Id: string, participant2Id: string): Promise<Conversation> {
    // Check if conversation already exists
    const existing = await db('conversations')
      .where((builder) => {
        void builder
          .where({ participant1_id: participant1Id, participant2_id: participant2Id })
          .orWhere({ participant1_id: participant2Id, participant2_id: participant1Id });
      })
      .first();

    if (existing) return existing;

    const [conversation] = await db('conversations')
      .insert({
        participant1_id: participant1Id,
        participant2_id: participant2Id,
      })
      .returning('*');

    return conversation;
  },

  async findConversation(participant1Id: string, participant2Id: string): Promise<Conversation | undefined> {
    return await db('conversations')
      .where((builder) => {
        void builder
          .where({ participant1_id: participant1Id, participant2_id: participant2Id })
          .orWhere({ participant1_id: participant2Id, participant2_id: participant1Id });
      })
      .first();
  },

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db('conversations')
      .where({ participant1_id: userId })
      .orWhere({ participant2_id: userId })
      .orderBy('last_message_at', 'desc');
  },

  async createMessage(data: CreateMessageData): Promise<Message> {
    const messageData = {
      ...data,
      message_type: data.message_type || 'text',
      read: false,
      deleted: false,
    };

    const [message] = await db('messages').insert(messageData).returning('*');

    // Update conversation's last_message_at
    await db('conversations')
      .where({ id: data.conversation_id })
      .update({ last_message_at: db.fn.now() });

    return message;
  },

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    return await db('messages')
      .where({ conversation_id: conversationId, deleted: false })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  async markAsRead(messageId: string): Promise<void> {
    await db('messages')
      .where({ id: messageId })
      .update({ read: true, read_at: db.fn.now() });
  },

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await db('messages')
      .where({ conversation_id: conversationId })
      .whereNot({ sender_id: userId })
      .update({ read: true, read_at: db.fn.now() });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await db('messages')
      .where({ id: messageId })
      .update({ deleted: true, updated_at: db.fn.now() });
  },

  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.getUserConversations(userId);
    const conversationIds = conversations.map(c => c.id);

    const result = await db('messages')
      .whereIn('conversation_id', conversationIds)
      .whereNot({ sender_id: userId })
      .where({ read: false, deleted: false })
      .count('* as count')
      .first();

    return Number(result?.count || 0);
  },
};
