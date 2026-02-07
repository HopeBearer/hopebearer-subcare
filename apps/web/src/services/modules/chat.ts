import { api } from '@/lib/api';
import { ApiResponse } from '@subcare/types';

// Types
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model?: string;
  contextInfo?: {
    messageCount: number;
    totalMessages: number;
    contextTokens: number;
    userMessageTokens: number;
    maxContextTokens: number;
    trimmed: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: any[];
  toolCallId?: string;
  tokenCount?: number;
  thinkingSteps?: string[];
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationDTO {
  title?: string;
}

export interface SendMessageDTO {
  content: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Chat API Service
export const chatService = {
  // Conversations
  createConversation: async (data?: CreateConversationDTO): Promise<Conversation> => {
    const response = await api.post<any, ApiResponse<Conversation>>(
      '/chat/conversations', 
      data || {}
    );
    return response.data;
  },

  listConversations: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get<any, ApiResponse<PaginatedResponse<Conversation>>>(
      '/chat/conversations',
      { params }
    );
    return response.data;
  },

  getConversation: async (id: string): Promise<ConversationWithMessages> => {
    const response = await api.get<any, ApiResponse<ConversationWithMessages>>(
      `/chat/conversations/${id}`
    );
    return response.data;
  },

  updateConversation: async (id: string, data: { title: string }): Promise<Conversation> => {
    const response = await api.patch<any, ApiResponse<Conversation>>(
      `/chat/conversations/${id}`,
      data
    );
    return response.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/chat/conversations/${id}`);
  },

  // Messages
  getMessages: async (
    conversationId: string, 
    params?: { limit?: number; before?: string }
  ): Promise<{ items: Message[]; total: number }> => {
    const response = await api.get<any, ApiResponse<{ items: Message[]; total: number }>>(
      `/chat/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data;
  },

  // REST fallback for sending messages (non-streaming)
  sendMessage: async (conversationId: string, data: SendMessageDTO): Promise<Message> => {
    const response = await api.post<any, ApiResponse<Message>>(
      `/chat/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  }
};
