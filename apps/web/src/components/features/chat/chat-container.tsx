'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/store'
import { useSocket } from '@/hooks/use-socket'
import { ChatMessage } from './chat-message'
import { StreamingMessage } from './streaming-message'
import { ChatInput } from './chat-input'
import { Message } from '@/services'
import { Bot, Sparkles, Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/hooks'
import { useChatScroll } from '@/hooks/use-chat-scroll'

interface ChatContainerProps {
  conversationId?: string
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { t, i18n } = useTranslation('common')
  const socket = useSocket()
  const containerRef = useRef<HTMLDivElement>(null)
  const prevConversationIdRef = useRef<string | null>(null)

  const {
    messages,
    isLoadingConversation,
    isLoadingMessages,
    hasMoreMessages,
    streamingSessions,
    selectConversation,
    loadMoreMessages,
    createConversation,
    startSending
  } = useChatStore()

  // 获取 store 中的 currentConversationId
  const storeConversationId = useChatStore(state => state.currentConversationId)
  const effectiveConversationId = conversationId || storeConversationId || null

  // 从 per-conversation streamingSessions 读取当前会话的流式状态
  const currentSession = effectiveConversationId ? streamingSessions[effectiveConversationId] : undefined
  const isCurrentStreaming = !!currentSession
  const streamingContent = currentSession?.content || ''
  const toolCallHistory = currentSession?.toolCallHistory || []
  const isSending = currentSession?.isSending || false

  const { handleScroll, messagesEndRef } = useChatScroll({
    containerRef,
    messages,
    hasMoreMessages,
    isLoadingMessages,
    loadMoreMessages,
    isStreaming: isCurrentStreaming,
    isLoadingConversation,
    streamingContent,
    conversationId: effectiveConversationId || undefined
  })

  /** 会话切换 */
  useEffect(() => {
    if (conversationId && prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId
      selectConversation(conversationId)
    }
  }, [conversationId, selectConversation])

  // Chat stream handlers are registered globally in layout

  /** 发送消息 */
  const handleSend = async (content: string) => {
    if (!socket) return

    let targetConversationId = conversationId || useChatStore.getState().currentConversationId
    let isNewConversation = false

    // 竞态防护：如果该会话已经在发送中，阻止重复发送
    if (targetConversationId) {
      const existingSession = useChatStore.getState().streamingSessions[targetConversationId]
      if (existingSession?.isSending) {
        console.warn('[ChatContainer] 竞态防护: 会话正在发送中，忽略重复请求', targetConversationId)
        return
      }
    }

    // 如果没有会话ID，则先创建新会话
    if (!targetConversationId) {
      try {
        const conversation = await createConversation()
        targetConversationId = conversation.id
        isNewConversation = true
      } catch (error) {
        console.error('[ChatContainer] Failed to create conversation:', error)
        return
      }
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: targetConversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    }

    // 使用 per-conversation streaming state
    // 同时保存消息快照用于竞态防护（切换会话时恢复）
    useChatStore.setState(state => {
      const updatedMessages = [...state.messages, tempMessage]
      return {
        messages: updatedMessages,
        streamingSessions: {
          ...state.streamingSessions,
          [targetConversationId!]: {
            content: '',
            isSending: true,
            toolCallHistory: [],
            messagesSnapshot: updatedMessages
          }
        }
      }
    })

    // 获取当前语言设置（从 i18n 实例获取更可靠）
    const currentLanguage = i18n.language || 'zh'
    console.log('[ChatContainer] Sending message with language:', currentLanguage)
    socket.emit('chat:message:send', { conversationId: targetConversationId, content, language: currentLanguage })

    // 更新 URL 但不触发组件重新渲染（避免 socket 断开重连导致消息丢失）
    if (isNewConversation) {
      window.history.replaceState(null, '', `/chat/${targetConversationId}`)
    }
  }

  // 判断是否显示欢迎页：没有 URL 参数且没有正在进行的会话
  const showWelcome = !conversationId && !storeConversationId && messages.length === 0 && !isCurrentStreaming

  // 新对话欢迎页面
  if (showWelcome) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl mx-auto px-6 text-center">
            {/* AI 头像 */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            
            {/* 标题 */}
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              {t('chat.welcome_title', '你好，我是 SubCare AI 助手')}
            </h1>
            
            {/* 介绍 */}
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {t('chat.welcome_description', '我可以帮你管理订阅、分析消费、提供财务建议。有任何问题都可以问我！')}
            </p>
            
            {/* 功能卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('chat.feature_1', '智能订阅管理')}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <Sparkles className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('chat.feature_2', '消费分析洞察')}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <Sparkles className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('chat.feature_3', '财务建议推荐')}</p>
              </div>
            </div>
          </div>
        </div>

        <ChatInput
          onSend={handleSend}
          isLoading={isSending}
        />
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto py-6">
          {hasMoreMessages && (
            <div className="flex justify-center py-4">
              {isLoadingMessages ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>加载更多消息...</span>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">
                  ↑ 向上滚动加载更多
                </div>
              )}
            </div>
          )}

          {messages.map(m => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {isCurrentStreaming && (
            <StreamingMessage
              content={streamingContent}
              toolCalls={toolCallHistory}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSend={handleSend}
        isLoading={isSending}
      />
    </div>
  )
}
