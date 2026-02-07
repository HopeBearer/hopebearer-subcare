import { useRef, useEffect, useCallback, RefObject } from 'react'
import { Message } from '@/services'

interface UseChatScrollOptions {
  containerRef: RefObject<HTMLDivElement | null>
  messages: Message[]
  hasMoreMessages: boolean
  isLoadingMessages: boolean
  loadMoreMessages: () => void
  isStreaming: boolean
  isLoadingConversation: boolean
  streamingContent?: string
  conversationId?: string
}

interface UseChatScrollReturn {
  handleScroll: () => void
  messagesEndRef: RefObject<HTMLDivElement | null>
}

/** 滚动阈值配置 */
const LOAD_THRESHOLD = 300
const BOTTOM_THRESHOLD = 80

export function useChatScroll({
  containerRef,
  messages,
  hasMoreMessages,
  isLoadingMessages,
  loadMoreMessages,
  isStreaming,
  isLoadingConversation,
  streamingContent = '',
  conversationId
}: UseChatScrollOptions): UseChatScrollReturn {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /** ========================
   * refs（不触发渲染）
   ======================== */

  const didInitScrollRef = useRef(false)
  const loadingTriggeredRef = useRef(false)
  const prevScrollHeightRef = useRef<number | null>(null)
  const isAtBottomRef = useRef(true)

  /** ========================
   * utils
   ======================== */

  const checkIsAtBottom = () => {
    const el = containerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD
  }

  /** ========================
   * scroll handler（核心）
   ======================== */

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    isAtBottomRef.current = checkIsAtBottom()

    // 顶部加载逻辑
    if (
      el.scrollTop <= LOAD_THRESHOLD &&
      hasMoreMessages &&
      !isLoadingMessages &&
      !loadingTriggeredRef.current &&
      messages.length > 0
    ) {
      loadingTriggeredRef.current = true
      prevScrollHeightRef.current = el.scrollHeight
      loadMoreMessages()
    }
  }, [hasMoreMessages, isLoadingMessages, messages.length, loadMoreMessages])

  /** ========================
   * 会话首次进入 → 滚到底（仅一次）
   ======================== */

  useEffect(() => {
    if (
      !isLoadingConversation &&
      messages.length > 0 &&
      !didInitScrollRef.current
    ) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        didInitScrollRef.current = true
        isAtBottomRef.current = true
      })
    }
  }, [isLoadingConversation, messages.length])

  /** ========================
   * 历史消息加载完成 → 恢复位置
   ======================== */

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (!isLoadingMessages && prevScrollHeightRef.current !== null) {
      const delta = el.scrollHeight - prevScrollHeightRef.current
      el.scrollTop += delta

      prevScrollHeightRef.current = null
    }
  }, [isLoadingMessages, messages.length])

  /** 确保 loadingTriggered 一定释放 */
  useEffect(() => {
    if (!isLoadingMessages) {
      loadingTriggeredRef.current = false
    }
  }, [isLoadingMessages])

  /** ========================
   * streaming 自动滚动（仅在用户本就在底部）
   ======================== */

  useEffect(() => {
    if (!isStreaming) return
    if (!isAtBottomRef.current) return

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isStreaming, streamingContent])

  /** ========================
   * 会话切换 → 重置滚动状态
   ======================== */

  useEffect(() => {
    didInitScrollRef.current = false
    isAtBottomRef.current = true
    loadingTriggeredRef.current = false
    prevScrollHeightRef.current = null
  }, [conversationId])

  return {
    handleScroll,
    messagesEndRef
  }
}
