'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChatStore, bufferStartSession, chunkBuffers, SessionStatus } from '@/store'
import { useAuthStore, useSettingsStore } from '@/store'
import { useSocket } from '@/hooks/use-socket'
import { ChatMessage } from './chat-message'
import { StreamingMessage } from './streaming-message'
import { ChatInput } from './chat-input'
import { Message } from '@/services'
import { Bot, Sparkles, Loader2, Settings, KeyRound } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/hooks'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { toast } from 'sonner'

interface ChatContainerProps {
  conversationId?: string
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { t, i18n } = useTranslation('common')
  const router = useRouter()
  const socket = useSocket()
  const containerRef = useRef<HTMLDivElement>(null)
  const prevConversationIdRef = useRef<string | null>(null)
  
  // AI Config check
  const user = useAuthStore(state => state.user)
  const hasAIConfig = user?.hasAIConfig ?? false

  // ===== 精细 Zustand 订阅 =====
  const messages = useChatStore(state => state.messages)
  const isLoadingConversation = useChatStore(state => state.isLoadingConversation)
  const isLoadingMessages = useChatStore(state => state.isLoadingMessages)
  const hasMoreMessages = useChatStore(state => state.hasMoreMessages)
  const selectConversation = useChatStore(state => state.selectConversation)
  const loadMoreMessages = useChatStore(state => state.loadMoreMessages)
  const createConversation = useChatStore(state => state.createConversation)
  const storeConversationId = useChatStore(state => state.currentConversationId)

  // 活跃流式内容（RAF flush 推送，≤60fps，已在 buffer 层限频，无需 useDeferredValue）
  const activeStreamContent = useChatStore(state => state.activeStreamContent)
  const activeToolCalls = useChatStore(state => state.activeToolCalls)
  const activeThinkingSteps = useChatStore(state => state.activeThinkingSteps)

  const effectiveConversationId = conversationId || storeConversationId || null

  // 精细订阅：只订阅当前会话的 sessionStatus（其他会话的状态变化不触发 re-render）
  const currentSessionStatus = useChatStore(state =>
    effectiveConversationId ? state.sessionStatuses[effectiveConversationId] : undefined
  ) as SessionStatus | undefined
  const isCurrentStreaming = currentSessionStatus === 'streaming'
  const isSending = currentSessionStatus === 'sending' || currentSessionStatus === 'streaming'

  const { handleScroll, messagesEndRef } = useChatScroll({
    containerRef,
    messages,
    hasMoreMessages,
    isLoadingMessages,
    loadMoreMessages,
    isStreaming: isCurrentStreaming,
    isLoadingConversation,
    streamingContent: activeStreamContent,
    conversationId: effectiveConversationId || undefined
  })

  /** 会话切换 — 防重复：sidebar 已同步调过 selectConversation 时不重复调用 */
  useEffect(() => {
    if (conversationId && prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId
      // 如果 store 已经切换到此会话（sidebar 提前调用了），跳过
      if (useChatStore.getState().currentConversationId !== conversationId) {
        selectConversation(conversationId)
      }
    }
  }, [conversationId, selectConversation])

  /** 发送消息 */
  const handleSend = async (content: string) => {
    if (!socket) return

    let targetConversationId = conversationId || useChatStore.getState().currentConversationId
    let isNewConversation = false

    // 竞态防护：如果该会话已经在发送/流式中，阻止重复发送
    if (targetConversationId) {
      const existingStatus = useChatStore.getState().sessionStatuses[targetConversationId]
      if (existingStatus === 'sending' || existingStatus === 'streaming') {
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

    // 单次 set(): 添加临时消息 + 直接设为 streaming（省去 sending→streaming 的额外 render）
    const updatedMessages = [...useChatStore.getState().messages, tempMessage]
    useChatStore.setState(state => ({
      messages: updatedMessages,
      pendingMessage: null,
      sessionStatuses: { ...state.sessionStatuses, [targetConversationId!]: 'streaming' as const }
    }))

    // 初始化 buffer（传入消息快照用于切换恢复）
    bufferStartSession(targetConversationId!, updatedMessages)

    // 获取当前语言设置
    const currentLanguage = i18n.language || 'zh'
    socket.emit('chat:message:send', { conversationId: targetConversationId, content, language: currentLanguage })

    // 更新 URL 但不触发组件重新渲染
    if (isNewConversation) {
      window.history.replaceState(null, '', `/chat/${targetConversationId}`)
    }
  }

  // 跳转到设置页 API Key 配置区域
  const handleGoToSettings = () => {
    useSettingsStore.getState().setActiveTab('api')
    router.push('/settings')
    toast.info(t('chat.no_api_key_toast'))
  }

  // 未配置 AI 服务 — 显示引导页
  if (!hasAIConfig) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center">
            {/* 图标 */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 flex items-center justify-center shadow-lg">
              <KeyRound className="w-10 h-10 text-amber-500" />
            </div>
            
            {/* 标题 */}
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              {t('chat.no_api_key_title')}
            </h1>
            
            {/* 描述 */}
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {t('chat.no_api_key_description')}
            </p>
            
            {/* 按钮 */}
            <button
              onClick={handleGoToSettings}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <Settings className="w-5 h-5" />
              {t('chat.go_to_settings')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 判断是否显示欢迎页
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
              content={activeStreamContent}
              toolCalls={activeToolCalls}
              thinkingSteps={activeThinkingSteps}
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
