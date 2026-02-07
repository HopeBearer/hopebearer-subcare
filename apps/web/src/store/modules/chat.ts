import { create } from 'zustand';
import { chatService, Conversation, Message, ConversationWithMessages } from '@/services';

// ==================== Types ====================

export type SessionStatus = 'idle' | 'sending' | 'streaming';

/** 后端返回的上下文信息 */
export interface ContextInfo {
  messageCount: number;      // 实际发送给 AI 的历史消息数
  totalMessages: number;     // 数据库中该会话的总历史消息数
  contextTokens: number;     // 历史消息的估算 token 数
  userMessageTokens: number; // 当前用户消息的估算 token 数
  maxContextTokens: number;  // token 预算上限
  trimmed: boolean;          // 是否因超过预算而裁剪了历史
}

export interface ToolCallEntry {
  id: string;
  toolName: string;
  status: 'started' | 'completed';
  timestamp: number;
}

/**
 * Layer 1: 内存缓冲区（模块级变量，不在 Zustand 中）
 * 
 * 所有 WebSocket chunk 直接写入这里，零渲染成本。
 * 仅由 RAF flush loop 读取并推送到 Zustand（仅活跃会话）。
 */
export interface ChunkBuffer {
  content: string;
  toolCalls: ToolCallEntry[];
  thinkingSteps: string[];     // 累积的思考步骤（持久显示）
  dirty: boolean;              // 自上次 flush 后有新数据
  messagesSnapshot: Message[];  // 发送时的消息快照（用于切换回来恢复）
}

/** 模块级 chunk 缓冲区 Map */
export const chunkBuffers = new Map<string, ChunkBuffer>();

/** RAF flush 循环 ID */
let rafId: number | null = null;
/** 当前是否有活跃的流式会话 */
let activeStreamCount = 0;
/** 帧计数器（用于长内容降频） */
let frameCount = 0;

/** 长内容降频阈值：内容超过此字符数时降到每 2 帧 flush 一次 */
const LONG_CONTENT_THRESHOLD = 5000;

/**
 * 启动 RAF flush 循环
 * 每帧最多一次 Zustand set()，仅 flush 活跃会话的内容
 * 长内容（>5000字符）自动降频到每 2 帧一次（安全阀）
 */
function startFlushLoop() {
  if (rafId !== null) return; // 已在运行
  frameCount = 0;

  function flush() {
    frameCount++;
    const state = useChatStore.getState();
    const activeId = state.currentConversationId;

    if (activeId) {
      const buffer = chunkBuffers.get(activeId);
      if (buffer && buffer.dirty) {
        // 长内容安全阀：内容超长时降频到每 2 帧 flush 一次
        const isLongContent = buffer.content.length > LONG_CONTENT_THRESHOLD;
        const shouldFlush = !isLongContent || frameCount % 2 === 0;

        if (shouldFlush) {
          // 单次 set(): 将缓冲区内容推送到 Zustand 可渲染状态
          useChatStore.setState({
            activeStreamContent: buffer.content,
            activeToolCalls: [...buffer.toolCalls],
            activeThinkingSteps: [...buffer.thinkingSteps]
          });
          buffer.dirty = false;
        }
      }
    }

    // 如果还有活跃流式会话，继续循环
    if (activeStreamCount > 0) {
      rafId = requestAnimationFrame(flush);
    } else {
      rafId = null;
      frameCount = 0;
    }
  }

  rafId = requestAnimationFrame(flush);
}

/**
 * 停止 RAF flush 循环
 */
function stopFlushLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ==================== Chunk Buffer 操作（Layer 1，零渲染） ====================

/**
 * 向缓冲区追加 chunk（不触发任何 React 渲染）
 */
export function bufferAppendChunk(conversationId: string, chunk: string) {
  const buffer = chunkBuffers.get(conversationId);
  if (!buffer) {
    // 会话已结束或被删除，忽略迟到的 chunk
    console.warn('[bufferAppendChunk] No buffer for', conversationId, '- chunk dropped:', chunk.substring(0, 50));
    return;
  }
  buffer.content += chunk;
  buffer.dirty = true;
  
  // 调试日志（低频输出，避免刷屏）
  if (buffer.content.length <= chunk.length || buffer.content.length % 200 < chunk.length) {
    console.debug('[bufferAppendChunk]', conversationId, 'content length:', buffer.content.length, 'chunk:', chunk.substring(0, 30));
  }
}

/**
 * 向缓冲区添加 tool call（不触发任何 React 渲染）
 */
export function bufferAddToolCall(conversationId: string, toolName: string, status: 'started' | 'completed') {
  let buffer = chunkBuffers.get(conversationId);
  if (!buffer) {
    // 如果 buffer 不存在但是 started 事件，创建它（tool call 可能先于 chunk 到达）
    if (status === 'started') {
      buffer = { content: '', toolCalls: [], thinkingSteps: [], dirty: true, messagesSnapshot: [] };
      chunkBuffers.set(conversationId, buffer);
      // 同时设置 session status
      useChatStore.getState().setSessionStatus(conversationId, 'streaming');
      activeStreamCount++;
      startFlushLoop();
    }
    return;
  }

  if (status === 'completed') {
    const idx = buffer.toolCalls.findIndex(t => t.toolName === toolName && t.status === 'started');
    if (idx !== -1) {
      buffer.toolCalls[idx] = { ...buffer.toolCalls[idx], status: 'completed' };
    }
  } else {
    buffer.toolCalls.push({
      id: `${Date.now()}-${toolName}`,
      toolName,
      status,
      timestamp: Date.now()
    });
  }
  buffer.dirty = true;
}

/**
 * 初始化缓冲区（发送消息时调用）
 */
export function bufferStartSession(conversationId: string, messagesSnapshot: Message[]) {
  chunkBuffers.set(conversationId, {
    content: '',
    toolCalls: [],
    thinkingSteps: [],
    dirty: false,
    messagesSnapshot
  });
  activeStreamCount++;
  startFlushLoop();
}

/**
 * 流式完成 — 最终 flush + 清理缓冲区，写入 Zustand
 * 
 * 关键修复：在删除 buffer 前做最终 flush，防止短回复/微合并场景下
 * complete 事件和最后的 chunk 在同一 tick 到达，RAF flush 来不及运行。
 */
export function bufferCompleteSession(conversationId: string, message: Message) {
  // ⚡ 最终 flush：先将 buffer 中未 flush 的内容推送到 Zustand
  const buffer = chunkBuffers.get(conversationId);
  if (buffer && buffer.dirty) {
    const currentState = useChatStore.getState();
    if (currentState.currentConversationId === conversationId) {
      useChatStore.setState({
        activeStreamContent: buffer.content,
        activeToolCalls: [...buffer.toolCalls],
        activeThinkingSteps: [...buffer.thinkingSteps]
      });
    }
  }

  chunkBuffers.delete(conversationId);
  activeStreamCount = Math.max(0, activeStreamCount - 1);
  if (activeStreamCount === 0) {
    stopFlushLoop();
  }

  const state = useChatStore.getState();
  const isCurrentConversation = state.currentConversationId === conversationId;
  const alreadyExists = state.messages.some(m => m.id === message.id);

  // 先添加完成的消息到 messages（让 ChatMessage 先渲染）
  // 然后延迟一帧清理流式状态（确保视觉过渡平滑）
  useChatStore.setState(prev => {
    const { [conversationId]: _, ...rest } = prev.sessionStatuses;
    const updates: Partial<ChatState> = {
      sessionStatuses: rest,
    };

    if (isCurrentConversation && !alreadyExists) {
      updates.messages = [...prev.messages, message];
    }

    return updates as any;
  });

  // 延迟一帧清理流式渲染状态，避免 StreamingMessage 和 ChatMessage 同时消失
  requestAnimationFrame(() => {
    const afterState = useChatStore.getState();
    if (afterState.currentConversationId === conversationId) {
      useChatStore.setState({
        activeStreamContent: '',
        activeToolCalls: [],
        activeThinkingSteps: []
      });
    }
  });

  // 局部更新 conversations 排序（替代 fetchConversations(true)）
  useChatStore.setState(prev => ({
    conversations: prev.conversations.map(c =>
      c.id === conversationId ? { ...c, updatedAt: new Date().toISOString() } : c
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }));
}

/**
 * 流式错误 — 清理缓冲区
 */
export function bufferResetSession(conversationId: string) {
  chunkBuffers.delete(conversationId);
  activeStreamCount = Math.max(0, activeStreamCount - 1);
  if (activeStreamCount === 0) {
    stopFlushLoop();
  }

  useChatStore.setState(prev => {
    const { [conversationId]: _, ...rest } = prev.sessionStatuses;
    const isCurrentConversation = prev.currentConversationId === conversationId;
    return {
      sessionStatuses: rest,
      activeStreamContent: isCurrentConversation ? '' : prev.activeStreamContent,
      activeToolCalls: isCurrentConversation ? [] : prev.activeToolCalls,
      activeThinkingSteps: isCurrentConversation ? [] : prev.activeThinkingSteps,
    };
  });
}

/**
 * 累积思考步骤到缓冲区（通过 RAF flush 推送到 Zustand）
 * 
 * 思考步骤是累积的：每个新步骤追加到数组末尾，不覆盖之前的步骤。
 * 这样用户可以看到完整的思考过程。
 */
export function bufferSetThinking(conversationId: string, summary: string | null) {
  if (!summary) return;

  const buffer = chunkBuffers.get(conversationId);
  if (buffer) {
    // 避免重复添加相同的思考步骤
    if (buffer.thinkingSteps[buffer.thinkingSteps.length - 1] !== summary) {
      buffer.thinkingSteps.push(summary);
      buffer.dirty = true;
    }
  } else {
    // buffer 不存在时直接更新 Zustand（兼容边缘情况）
    const state = useChatStore.getState();
    if (state.currentConversationId === conversationId) {
      const currentSteps = state.activeThinkingSteps;
      if (currentSteps[currentSteps.length - 1] !== summary) {
        useChatStore.setState({ activeThinkingSteps: [...currentSteps, summary] });
      }
    }
  }
}

// ==================== Zustand Store (Layer 2) ====================

interface ChatState {
  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;
  hasMoreConversations: boolean;
  conversationsPage: number;

  // Current conversation
  currentConversationId: string | null;
  currentConversation: ConversationWithMessages | null;
  isLoadingConversation: boolean;

  // Messages (for current conversation)
  messages: Message[];
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  pendingMessage: string | null;

  // ===== 活跃会话的渲染状态（RAF flush，≤60fps） =====
  activeStreamContent: string;
  activeToolCalls: ToolCallEntry[];
  activeThinkingSteps: string[]; // ReAct 思考步骤描述（累积）

  // ===== 上下文信息（后端提供，每次发送消息时更新） =====
  contextInfo: ContextInfo | null;

  // ===== 会话状态枚举（极少变化：start/complete 时才更新） =====
  sessionStatuses: Record<string, SessionStatus>;

  // Actions
  fetchConversations: (reset?: boolean) => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: string | null) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  
  // Message actions
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<Message | null>;
  
  // Session status (low-frequency, only start/complete/error)
  setSessionStatus: (conversationId: string, status: SessionStatus) => void;
  
  // State setters
  setCurrentConversationId: (id: string | null) => void;
  setPendingMessage: (content: string | null) => void;
  
  // Local state update (without API call)
  updateConversationTitleLocal: (id: string, title: string) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  // Initial state
  conversations: [],
  isLoadingConversations: false,
  hasMoreConversations: true,
  conversationsPage: 1,
  
  currentConversationId: null,
  currentConversation: null,
  isLoadingConversation: false,
  
  messages: [],
  isLoadingMessages: false,
  hasMoreMessages: true,
  pendingMessage: null,
  
  // Active session render state (RAF-flushed)
  activeStreamContent: '',
  activeToolCalls: [],
  activeThinkingSteps: [],

  // Context info (from backend)
  contextInfo: null,

  // Session statuses (low-frequency updates)
  sessionStatuses: {},

  // Fetch conversations
  fetchConversations: async (reset = true) => {
    set({ isLoadingConversations: true });
    try {
      const page = reset ? 1 : get().conversationsPage;
      const response = await chatService.listConversations({ page, limit: 20 });
      
      const newConversations = reset 
        ? response.items 
        : [...get().conversations, ...response.items];

      // 页面刷新后 fetchConversations 可能晚于 selectConversation 完成，
      // 此时 contextInfo 仍为 null，需要从新加载的列表中补偿
      const { currentConversationId, contextInfo } = get();
      let patchContextInfo: Partial<ChatState> = {};
      if (currentConversationId && !contextInfo) {
        const conv = newConversations.find(c => c.id === currentConversationId);
        if (conv?.contextInfo) {
          patchContextInfo = {
            contextInfo: {
              messageCount: conv.contextInfo.messageCount,
              totalMessages: conv.contextInfo.totalMessages,
              contextTokens: conv.contextInfo.contextTokens,
              userMessageTokens: conv.contextInfo.userMessageTokens,
              maxContextTokens: conv.contextInfo.maxContextTokens,
              trimmed: conv.contextInfo.trimmed,
            }
          };
        }
      }

      set({
        conversations: newConversations,
        hasMoreConversations: response.items.length === 20,
        conversationsPage: page,
        isLoadingConversations: false,
        ...patchContextInfo
      });
    } catch (error) {
      console.error('[ChatStore] fetchConversations error:', error);
      set({ isLoadingConversations: false });
    }
  },

  loadMoreConversations: async () => {
    const { hasMoreConversations, isLoadingConversations, conversationsPage } = get();
    if (!hasMoreConversations || isLoadingConversations) return;
    
    set({ conversationsPage: conversationsPage + 1 });
    await get().fetchConversations(false);
  },

  // Create new conversation
  createConversation: async (title?: string) => {
    const conversation = await chatService.createConversation({ title });
    set(state => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      currentConversation: { ...conversation, messages: [] },
      messages: [],
      hasMoreMessages: false
    }));
    return conversation;
  },

  // Select conversation — 单次 set() 合并，配合 buffer 快照恢复
  selectConversation: async (id: string | null) => {
    const { currentConversationId, isLoadingConversation, sessionStatuses } = get();
    
    console.log('[ChatStore] selectConversation called', {
      id,
      from: currentConversationId,
      hasBuffer: id ? chunkBuffers.has(id) : false,
      sessionStatus: id ? sessionStatuses[id] : undefined,
      isLoading: isLoadingConversation
    });
    
    if (id === currentConversationId && isLoadingConversation) {
      return;
    }
    
    if (!id) {
      set({
        currentConversationId: null,
        currentConversation: null,
        messages: [],
        hasMoreMessages: false,
        activeStreamContent: '',
        activeToolCalls: [],
        activeThinkingSteps: [],
        contextInfo: null
      });
      return;
    }

    // Skip if same conversation and already has messages
    if (id === currentConversationId && get().messages.length > 0) {
      return;
    }

    // 检查目标会话是否正在流式中（buffer 存在）
    const targetBuffer = chunkBuffers.get(id);
    if (targetBuffer) {
      // 目标正在流式：恢复快照 + 立即 flush buffer 内容（单次 set()）
      console.log('[ChatStore] selectConversation: 恢复流式 buffer', {
        id,
        contentLen: targetBuffer.content.length,
        toolCalls: targetBuffer.toolCalls.length,
        snapshotMsgs: targetBuffer.messagesSnapshot.length,
      });
      set({
        currentConversationId: id,
        currentConversation: null,
        messages: targetBuffer.messagesSnapshot.length > 0 ? targetBuffer.messagesSnapshot : get().messages,
        hasMoreMessages: true,
        isLoadingConversation: false,
        activeStreamContent: targetBuffer.content,
        activeToolCalls: [...targetBuffer.toolCalls],
        activeThinkingSteps: [...targetBuffer.thinkingSteps]
      });
      targetBuffer.dirty = false;
      return;
    }

    // 普通切换：从 DB 加载（单次 set() 立即切换 + 异步加载）
    // 尝试从已加载的 conversations 列表中恢复 contextInfo
    const cachedConversation = get().conversations.find(c => c.id === id);
    set({
      isLoadingConversation: true,
      currentConversationId: id,
      messages: [],
      activeStreamContent: '',
      activeToolCalls: [],
      activeThinkingSteps: [],
      contextInfo: cachedConversation?.contextInfo ? {
        messageCount: cachedConversation.contextInfo.messageCount,
        totalMessages: cachedConversation.contextInfo.totalMessages,
        contextTokens: cachedConversation.contextInfo.contextTokens,
        userMessageTokens: cachedConversation.contextInfo.userMessageTokens,
        maxContextTokens: cachedConversation.contextInfo.maxContextTokens,
        trimmed: cachedConversation.contextInfo.trimmed,
      } : null
    });
    
    try {
      const { items, total } = await chatService.getMessages(id, { limit: 6 });
      const orderedMessages = [...items].reverse();
      
      // 验证：加载完成时仍在同一会话（防止快速切换竞态）
      if (get().currentConversationId !== id) return;
      
      // 恢复 contextInfo：页面刷新时首次 set 时 conversations 可能尚未加载，
      // 此时 fetchConversations 大概率已完成，重新从缓存中查找
      let resolvedContextInfo = get().contextInfo;
      if (!resolvedContextInfo) {
        const cachedConv = get().conversations.find(c => c.id === id);
        if (cachedConv?.contextInfo) {
          resolvedContextInfo = {
            messageCount: cachedConv.contextInfo.messageCount,
            totalMessages: cachedConv.contextInfo.totalMessages,
            contextTokens: cachedConv.contextInfo.contextTokens,
            userMessageTokens: cachedConv.contextInfo.userMessageTokens,
            maxContextTokens: cachedConv.contextInfo.maxContextTokens,
            trimmed: cachedConv.contextInfo.trimmed,
          };
        }
      }

      set({
        currentConversation: null,
        messages: orderedMessages,
        hasMoreMessages: items.length < total,
        isLoadingConversation: false,
        ...(resolvedContextInfo ? { contextInfo: resolvedContextInfo } : {})
      });
    } catch (error) {
      console.error('[ChatStore] selectConversation error:', error);
      if (get().currentConversationId === id) {
        set({ isLoadingConversation: false, hasMoreMessages: false });
      }
    }
  },

  // Load more (older) messages
  loadMoreMessages: async () => {
    const { currentConversationId, messages, isLoadingMessages, hasMoreMessages } = get();
    
    if (!currentConversationId || isLoadingMessages || !hasMoreMessages) {
      return;
    }
    
    set({ isLoadingMessages: true });
    
    try {
      const oldestMessage = messages[0];
      const beforeId = oldestMessage?.id;
      
      const { items, total } = await chatService.getMessages(
        currentConversationId, 
        { limit: 6, before: beforeId }
      );
      
      if (items.length === 0) {
        set({ hasMoreMessages: false, isLoadingMessages: false });
        return;
      }
      
      const olderMessages = [...items].reverse();
      
      set(state => {
        const existingIds = new Set(state.messages.map(m => m.id));
        const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
        const combinedMessages = [...newMessages, ...state.messages];
        
        return {
          messages: combinedMessages,
          hasMoreMessages: combinedMessages.length < total,
          isLoadingMessages: false
        };
      });
    } catch (error) {
      console.error('[ChatStore] loadMoreMessages error:', error);
      set({ isLoadingMessages: false });
    }
  },

  // Update conversation title
  updateConversationTitle: async (id: string, title: string) => {
    try {
      await chatService.updateConversation(id, { title });
      set(state => ({
        conversations: state.conversations.map(c => 
          c.id === id ? { ...c, title } : c
        ),
        currentConversation: state.currentConversation?.id === id 
          ? { ...state.currentConversation, title }
          : state.currentConversation
      }));
    } catch (error) {
      console.error('[ChatStore] updateConversationTitle error:', error);
    }
  },

  // Delete conversation
  deleteConversation: async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      
      // 清理 buffer
      chunkBuffers.delete(id);

      const { currentConversationId, conversations } = get();
      const { [id]: _, ...remainingStatuses } = get().sessionStatuses;
      
      set({
        conversations: conversations.filter(c => c.id !== id),
        currentConversationId: currentConversationId === id ? null : currentConversationId,
        currentConversation: currentConversationId === id ? null : get().currentConversation,
        messages: currentConversationId === id ? [] : get().messages,
        sessionStatuses: remainingStatuses,
        activeStreamContent: currentConversationId === id ? '' : get().activeStreamContent,
        activeToolCalls: currentConversationId === id ? [] : get().activeToolCalls,
        activeThinkingSteps: currentConversationId === id ? [] : get().activeThinkingSteps,
      });
    } catch (error) {
      console.error('[ChatStore] deleteConversation error:', error);
    }
  },

  // Send message (REST fallback)
  sendMessage: async (content: string) => {
    const { currentConversationId } = get();
    if (!currentConversationId || !content.trim()) return null;

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    set(state => ({
      messages: [...state.messages, tempUserMessage],
      pendingMessage: null,
      sessionStatuses: { ...state.sessionStatuses, [currentConversationId]: 'sending' as SessionStatus }
    }));

    try {
      const response = await chatService.sendMessage(currentConversationId, { content });
      
      const convId = currentConversationId;
      set(state => {
        const { [convId]: _, ...rest } = state.sessionStatuses;
        return {
          messages: [
            ...state.messages.filter(m => m.id !== tempUserMessage.id),
            { ...tempUserMessage, id: response.id },
            response
          ],
          sessionStatuses: rest
        };
      });

      return response;
    } catch (error) {
      console.error('[ChatStore] sendMessage error:', error);
      const convId = currentConversationId;
      set(state => {
        const { [convId]: _, ...rest } = state.sessionStatuses;
        return {
          messages: state.messages.filter(m => m.id !== tempUserMessage.id),
          sessionStatuses: rest
        };
      });
      return null;
    }
  },

  // Set session status (low-frequency)
  setSessionStatus: (conversationId: string, status: SessionStatus) => {
    set(state => ({
      sessionStatuses: {
        ...state.sessionStatuses,
        [conversationId]: status
      }
    }));
  },

  // State setters
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setPendingMessage: (content) => set({ pendingMessage: content }),
  
  // Local state update (without API call) - used for WebSocket title updates
  updateConversationTitleLocal: (id: string, title: string) => {
    set(state => ({
      conversations: state.conversations.map(c => 
        c.id === id ? { ...c, title } : c
      ),
      currentConversation: state.currentConversation?.id === id 
        ? { ...state.currentConversation, title }
        : state.currentConversation
    }));
  }
}));
