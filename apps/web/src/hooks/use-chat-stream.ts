import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useChatStore } from '@/store';
import { Message } from '@/services';

export const useChatStream = () => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleChunk = (data: { conversationId: string; chunk: string }) => {
      useChatStore.getState().appendStreamingContent(data.conversationId, data.chunk);
    };

    const handleToolCall = (data: { conversationId: string; toolName: string; status: 'started' | 'completed' }) => {
      useChatStore.getState().addToolCall(data.conversationId, data.toolName, data.status);
    };

    const handleComplete = (data: { conversationId: string; message: Message }) => {
      useChatStore.getState().completeStreaming(data.conversationId, data.message);
    };

    const handleError = (data: { conversationId: string }) => {
      useChatStore.getState().resetStreaming(data.conversationId);
    };

    const handleTitleUpdated = (data: { conversationId: string; title: string }) => {
      // Title updates apply regardless of current conversation
      useChatStore.getState().updateConversationTitleLocal(data.conversationId, data.title);
    };

    socket.on('chat:message:chunk', handleChunk);
    socket.on('chat:message:tool_call', handleToolCall);
    socket.on('chat:message:complete', handleComplete);
    socket.on('chat:message:error', handleError);
    socket.on('chat:message:title_updated', handleTitleUpdated);

    return () => {
      socket.off('chat:message:chunk', handleChunk);
      socket.off('chat:message:tool_call', handleToolCall);
      socket.off('chat:message:complete', handleComplete);
      socket.off('chat:message:error', handleError);
      socket.off('chat:message:title_updated', handleTitleUpdated);
    };
  }, [socket]);

  return socket;
};
