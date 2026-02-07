import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useChatStore, ContextInfo, bufferAppendChunk, bufferAddToolCall, bufferCompleteSession, bufferResetSession, bufferSetThinking } from '@/store';
import { Message } from '@/services';

/**
 * WebSocket 流式事件注册
 * 
 * 所有 chunk 直接写入模块级 buffer（零渲染），
 * 由 RAF flush loop 按帧推送到 Zustand（仅活跃会话）。
 * 
 * tool_call / complete / error 等低频事件仍走 Zustand。
 */
export const useChatStream = () => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    // ✅ 高频事件：直接写 buffer，零渲染
    const handleChunk = (data: { conversationId: string; chunk: string }) => {
      bufferAppendChunk(data.conversationId, data.chunk);
    };

    // ✅ 中频事件：写 buffer（bufferAddToolCall 内部处理 edge case 的 sessionStatus）
    const handleToolCall = (data: { conversationId: string; toolName: string; status: 'started' | 'completed' }) => {
      bufferAddToolCall(data.conversationId, data.toolName, data.status);
    };

    // ✅ 低频事件：完成流式，清理 buffer，写入最终消息
    const handleComplete = (data: { conversationId: string; message: Message }) => {
      bufferCompleteSession(data.conversationId, data.message);
    };

    // ✅ 低频事件：错误，清理 buffer
    const handleError = (data: { conversationId: string }) => {
      bufferResetSession(data.conversationId);
    };

    // ✅ 低频事件：标题更新
    const handleTitleUpdated = (data: { conversationId: string; title: string }) => {
      useChatStore.getState().updateConversationTitleLocal(data.conversationId, data.title);
    };

    // ✅ 低频事件：ReAct 思考步骤
    const handleThinking = (data: { conversationId: string; step: number; action: string; toolName?: string; summary: string }) => {
      bufferSetThinking(data.conversationId, data.summary);
    };

    // ✅ 低频事件：上下文信息（后端实际发送给 AI 的历史消息数 + token 数）
    const handleContextInfo = (data: ContextInfo & { conversationId: string }) => {
      const info: ContextInfo = {
        messageCount: data.messageCount,
        totalMessages: data.totalMessages,
        contextTokens: data.contextTokens,
        userMessageTokens: data.userMessageTokens,
        maxContextTokens: data.maxContextTokens,
        trimmed: data.trimmed
      };
      const state = useChatStore.getState();
      // 更新当前活跃会话的 contextInfo（实时显示）
      if (state.currentConversationId === data.conversationId) {
        useChatStore.setState({ contextInfo: info });
      }
      // 同步更新 conversations 列表缓存（切换回来时可恢复）
      useChatStore.setState(prev => ({
        conversations: prev.conversations.map(c =>
          c.id === data.conversationId ? { ...c, contextInfo: info } : c
        )
      }));
    };

    socket.on('chat:message:chunk', handleChunk);
    socket.on('chat:message:tool_call', handleToolCall);
    socket.on('chat:message:complete', handleComplete);
    socket.on('chat:message:error', handleError);
    socket.on('chat:message:title_updated', handleTitleUpdated);
    socket.on('chat:message:thinking', handleThinking);
    socket.on('chat:message:context_info', handleContextInfo);

    return () => {
      socket.off('chat:message:chunk', handleChunk);
      socket.off('chat:message:tool_call', handleToolCall);
      socket.off('chat:message:complete', handleComplete);
      socket.off('chat:message:error', handleError);
      socket.off('chat:message:title_updated', handleTitleUpdated);
      socket.off('chat:message:thinking', handleThinking);
      socket.off('chat:message:context_info', handleContextInfo);
    };
  }, [socket]);

  return socket;
};
