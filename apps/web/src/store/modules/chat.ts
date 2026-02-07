import { create } from 'zustand';
import { chatService, Conversation, Message, ConversationWithMessages } from '@/services';

/**
 * 每个会话的流式状态（按 conversationId 隔离）
 * 支持多会话并行对话
 * 
 * messagesSnapshot: 流式进行时的消息快照，用于切换会话时保留/恢复上下文
 * 防止竞态：切换到其他会话再切回来时，避免因重新从 DB 加载而丢失正在进行的消息
 */
interface ConversationStreamState {
  content: string;
  isSending: boolean;
  toolCallHistory: Array<{ id: string; toolName: string; status: 'started' | 'completed'; timestamp: number }>;
  messagesSnapshot?: Message[];
}

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

  // Per-conversation streaming state (supports concurrent sessions)
  streamingSessions: Record<string, ConversationStreamState>;

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
  
  // Streaming actions (for WebSocket) - all per-conversation
  startSending: (conversationId: string) => void;
  appendStreamingContent: (conversationId: string, chunk: string) => void;
  addToolCall: (conversationId: string, toolName: string, status: 'started' | 'completed') => void;
  completeStreaming: (conversationId: string, message: Message) => void;
  resetStreaming: (conversationId: string) => void;
  
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
      
      // Per-conversation streaming state
      streamingSessions: {},

      // Fetch conversations
      fetchConversations: async (reset = true) => {
        set({ isLoadingConversations: true });
        try {
          const page = reset ? 1 : get().conversationsPage;
          const response = await chatService.listConversations({ page, limit: 20 });
          
          set({
            conversations: reset 
              ? response.items 
              : [...get().conversations, ...response.items],
            hasMoreConversations: response.items.length === 20,
            conversationsPage: page,
            isLoadingConversations: false
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

      // Select conversation - loads latest messages
      // 竞态防护: 切换会话时保存/恢复正在流式传输的会话的消息快照
      selectConversation: async (id: string | null) => {
        const { currentConversationId, isLoadingConversation, messages, streamingSessions } = get();
        
        if (id === currentConversationId && isLoadingConversation) {
          console.log('[ChatStore] selectConversation: Already loading this conversation, skipping');
          return;
        }
        
        // 切换出去前：如果当前会话正在流式传输，保存消息快照
        if (currentConversationId && currentConversationId !== id) {
          const currentSession = streamingSessions[currentConversationId];
          if (currentSession) {
            console.log('[ChatStore] 竞态防护: 保存流式会话消息快照', currentConversationId, '消息数:', messages.length);
            set(state => ({
              streamingSessions: {
                ...state.streamingSessions,
                [currentConversationId]: {
                  ...currentSession,
                  messagesSnapshot: [...messages]
                }
              }
            }));
          }
        }
        
        if (!id) {
          set({
            currentConversationId: null,
            currentConversation: null,
            messages: [],
            hasMoreMessages: false
          });
          return;
        }

        // Skip if same conversation and already has messages
        if (id === currentConversationId && get().messages.length > 0) {
          console.log('[ChatStore] selectConversation: Same conversation with messages, skipping');
          return;
        }

        // 竞态防护: 如果目标会话正在流式传输且有消息快照，直接恢复而不重新加载
        const targetSession = get().streamingSessions[id];
        if (targetSession?.messagesSnapshot && targetSession.messagesSnapshot.length > 0) {
          console.log('[ChatStore] 竞态防护: 恢复流式会话消息快照', id, '消息数:', targetSession.messagesSnapshot.length);
          set({
            currentConversationId: id,
            currentConversation: null,
            messages: targetSession.messagesSnapshot,
            hasMoreMessages: true, // 保守估计，允许向上加载更多
            isLoadingConversation: false
          });
          return;
        }

        set({ isLoadingConversation: true, currentConversationId: id, messages: [] });
        
        try {
          const { items, total } = await chatService.getMessages(id, { limit: 6 });
          
          console.log('[ChatStore] selectConversation: Loaded', { itemsCount: items.length, total, hasMore: items.length < total });
          
          const orderedMessages = [...items].reverse();
          
          set({
            currentConversation: null,
            messages: orderedMessages,
            hasMoreMessages: items.length < total,
            isLoadingConversation: false
          });
        } catch (error) {
          console.error('[ChatStore] selectConversation error:', error);
          set({ isLoadingConversation: false, hasMoreMessages: false });
        }
      },

      // Load more (older) messages
      loadMoreMessages: async () => {
        const { currentConversationId, messages, isLoadingMessages, hasMoreMessages } = get();
        console.log('[ChatStore] loadMoreMessages called:', { currentConversationId, messagesCount: messages.length, isLoadingMessages, hasMoreMessages });
        
        if (!currentConversationId || isLoadingMessages || !hasMoreMessages) {
          console.log('[ChatStore] loadMoreMessages skipped');
          return;
        }
        
        set({ isLoadingMessages: true });
        
        try {
          const oldestMessage = messages[0];
          const beforeId = oldestMessage?.id;
          console.log('[ChatStore] Loading messages before:', beforeId);
          
          const { items, total } = await chatService.getMessages(
            currentConversationId, 
            { limit: 6, before: beforeId }
          );
          
          console.log('[ChatStore] Loaded:', { itemsCount: items.length, total });
          
          if (items.length === 0) {
            set({ hasMoreMessages: false, isLoadingMessages: false });
            return;
          }
          
          const olderMessages = [...items].reverse();
          
          set(state => {
            const existingIds = new Set(state.messages.map(m => m.id));
            const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
            
            const combinedMessages = [...newMessages, ...state.messages];
            const newHasMore = combinedMessages.length < total;
            
            console.log('[ChatStore] After merge:', { 
              newCount: newMessages.length, 
              totalCount: combinedMessages.length, 
              hasMore: newHasMore 
            });
            
            return {
              messages: combinedMessages,
              hasMoreMessages: newHasMore,
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
          const { currentConversationId, conversations } = get();
          
          // Also clean up streaming session if exists
          const { [id]: _, ...remainingSessions } = get().streamingSessions;
          
          set({
            conversations: conversations.filter(c => c.id !== id),
            currentConversationId: currentConversationId === id ? null : currentConversationId,
            currentConversation: currentConversationId === id ? null : get().currentConversation,
            messages: currentConversationId === id ? [] : get().messages,
            streamingSessions: remainingSessions
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

        // Set per-conversation sending state
        set(state => ({
          messages: [...state.messages, tempUserMessage],
          pendingMessage: null,
          streamingSessions: {
            ...state.streamingSessions,
            [currentConversationId]: {
              content: '',
              isSending: true,
              toolCallHistory: []
            }
          }
        }));

        try {
          const response = await chatService.sendMessage(currentConversationId, { content });
          
          const convId = currentConversationId;
          set(state => {
            const { [convId]: _, ...remainingSessions } = state.streamingSessions;
            return {
              messages: [
                ...state.messages.filter(m => m.id !== tempUserMessage.id),
                { ...tempUserMessage, id: response.id },
                response
              ],
              streamingSessions: remainingSessions
            };
          });

          return response;
        } catch (error) {
          console.error('[ChatStore] sendMessage error:', error);
          const convId = currentConversationId;
          set(state => {
            const { [convId]: _, ...remainingSessions } = state.streamingSessions;
            return {
              messages: state.messages.filter(m => m.id !== tempUserMessage.id),
              streamingSessions: remainingSessions
            };
          });
          return null;
        }
      },

      // ==================== Per-conversation streaming actions ====================

      // Start sending for a specific conversation
      // 同时保存当前消息快照（如果是当前会话），防止切换时丢失
      startSending: (conversationId: string) => {
        set(state => ({
          streamingSessions: {
            ...state.streamingSessions,
            [conversationId]: {
              content: '',
              isSending: true,
              toolCallHistory: [],
              messagesSnapshot: state.currentConversationId === conversationId ? [...state.messages] : undefined
            }
          }
        }));
      },

      // Append streaming content for a specific conversation
      // 竞态防护: 只在 session 已存在时追加，避免向已删除/重置的 session 写入
      appendStreamingContent: (conversationId: string, chunk: string) => {
        set(state => {
          const session = state.streamingSessions[conversationId];
          if (!session) {
            // session 已被删除或重置，忽略迟到的 chunk
            console.debug('[ChatStore] 竞态防护: 忽略已结束会话的 chunk', conversationId);
            return state;
          }
          return {
            streamingSessions: {
              ...state.streamingSessions,
              [conversationId]: {
                ...session,
                content: session.content + chunk,
              }
            }
          };
        });
      },

      // Add tool call for a specific conversation
      addToolCall: (conversationId: string, toolName: string, status: 'started' | 'completed') => {
        set(state => {
          const session = state.streamingSessions[conversationId];
          if (!session) {
            // Create session if not exists (edge case: tool call before any chunk)
            if (status === 'started') {
              return {
                streamingSessions: {
                  ...state.streamingSessions,
                  [conversationId]: {
                    content: '',
                    isSending: true,
                    toolCallHistory: [
                      { id: `${Date.now()}-${toolName}`, toolName, status, timestamp: Date.now() }
                    ]
                  }
                }
              };
            }
            return {};
          }

          const history = session.toolCallHistory;
          const existingIndex = history.findIndex(
            t => t.toolName === toolName && t.status === 'started'
          );
          
          let updatedHistory: typeof history;
          if (status === 'completed' && existingIndex !== -1) {
            updatedHistory = [...history];
            updatedHistory[existingIndex] = { ...updatedHistory[existingIndex], status: 'completed' };
          } else if (status === 'started') {
            updatedHistory = [
              ...history,
              { id: `${Date.now()}-${toolName}`, toolName, status, timestamp: Date.now() }
            ];
          } else {
            return {};
          }

          return {
            streamingSessions: {
              ...state.streamingSessions,
              [conversationId]: {
                ...session,
                toolCallHistory: updatedHistory
              }
            }
          };
        });
      },

      // Complete streaming for a specific conversation
      // 竞态防护: 幂等操作，即使 session 已不存在也安全执行
      // 如果完成的会话不是当前活跃会话，将消息追加到 snapshot 中（切回来时可以看到）
      completeStreaming: (conversationId: string, message: Message) => {
        set(state => {
          const session = state.streamingSessions[conversationId];
          const isCurrentConversation = state.currentConversationId === conversationId;

          if (!session) {
            // session 已被删除或重置，仍然尝试追加消息（如果是当前会话）
            console.debug('[ChatStore] 竞态防护: session 已清理，仅追加消息', conversationId);
            const alreadyExists = state.messages.some(m => m.id === message.id);
            return {
              messages: isCurrentConversation && !alreadyExists ? [...state.messages, message] : state.messages,
            };
          }

          // Remove this conversation's streaming session
          const { [conversationId]: _, ...remainingSessions } = state.streamingSessions;
          
          if (isCurrentConversation) {
            // 当前活跃会话：直接追加到 messages
            const alreadyExists = state.messages.some(m => m.id === message.id);
            return {
              messages: !alreadyExists ? [...state.messages, message] : state.messages,
              streamingSessions: remainingSessions
            };
          } else {
            // 非活跃会话：消息追加到快照中，切回来时通过 selectConversation 从 DB 加载
            // 由于 session 已被移除，快照不再需要保留
            // (用户切回来时 selectConversation 会从 DB 重新加载，此时消息已被后端保存)
            return {
              streamingSessions: remainingSessions
            };
          }
        });

        // Update conversation in list (might have new title)
        get().fetchConversations(true);
      },

      // Reset streaming for a specific conversation
      resetStreaming: (conversationId: string) => {
        set(state => {
          if (!conversationId) return state;
          const { [conversationId]: _, ...remainingSessions } = state.streamingSessions;
          return {
            streamingSessions: remainingSessions
          };
        });
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
