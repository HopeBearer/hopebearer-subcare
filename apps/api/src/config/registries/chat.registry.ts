import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const chatRegistry: Record<string, RouteVersions> = {
  // Conversations
  'POST /chat/conversations': {
    v1: {
      handler: controllersV1.Chat.createConversation,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /chat/conversations': {
    v1: {
      handler: controllersV1.Chat.listConversations,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /chat/conversations/:id': {
    v1: {
      handler: controllersV1.Chat.getConversation,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'PATCH /chat/conversations/:id': {
    v1: {
      handler: controllersV1.Chat.updateConversation,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'DELETE /chat/conversations/:id': {
    v1: {
      handler: controllersV1.Chat.deleteConversation,
      middlewares: [authMiddleware.authenticate]
    }
  },

  // Messages
  'GET /chat/conversations/:id/messages': {
    v1: {
      handler: controllersV1.Chat.getMessages,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'POST /chat/conversations/:id/messages': {
    v1: {
      handler: controllersV1.Chat.sendMessage,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
