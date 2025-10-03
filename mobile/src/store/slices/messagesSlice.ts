import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

interface MessagesState {
  conversations: Record<string, Message[]>;
  unreadCount: number;
}

const initialState: MessagesState = {
  conversations: {},
  unreadCount: 0,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const { conversationId } = action.payload;
      if (!state.conversations[conversationId]) {
        state.conversations[conversationId] = [];
      }
      state.conversations[conversationId].push(action.payload);
      if (!action.payload.read) {
        state.unreadCount++;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      state.conversations[conversationId]?.forEach((msg) => {
        if (!msg.read) {
          msg.read = true;
          state.unreadCount--;
        }
      });
    },
  },
});

export const { addMessage, markAsRead } = messagesSlice.actions;
export default messagesSlice.reducer;
