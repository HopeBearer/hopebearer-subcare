import { Message } from '@subcare/database';

// 流式回调类型
export interface ChatStreamCallbacks {
  onChunk?: (chunk: string) => void;
  onToolCall?: (toolName: string, status: 'started' | 'completed') => void;
  onComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
}

// Chat Progress Event (for WebSocket)
export interface ChatProgressEvent {
  conversationId: string;
  type: 'chunk' | 'tool_call' | 'complete' | 'error' | 'title_updated' | 'thinking' | 'context_info';
  data: any;
}

export type ChatProgressCallback = (event: ChatProgressEvent) => void;

// 工具调用记录
export interface ToolCallRecord {
  name: string;
  arguments: string;
  result?: any;
  status: string;
  duration?: number;
}

// 查询处理参数
export interface QueryHandlerParams {
  conversationId: string;
  userId: string;
  content: string;
  provider: any;
  userCurrency?: string | null;
  callbacks?: ChatStreamCallbacks;
  onProgress?: ChatProgressCallback;
}

// 消息限制
export const MAX_MESSAGE_LENGTH = 8000;
export const MAX_HISTORY_MESSAGES = 50;
export const MAX_TOOL_CALLS = 10;
/** 上下文 token 预算（不含 system prompt 和当前用户消息） */
export const MAX_CONTEXT_TOKENS = 16000;

/**
 * 估算文本的 token 数量
 * CJK 字符：1 token/字  |  拉丁字符：~4 字符/token
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length;
  const nonCjkCount = text.length - cjkCount;
  return cjkCount + Math.ceil(nonCjkCount / 4);
}

/**
 * 按 token 预算裁剪历史消息
 * 从最新消息开始保留，直到 token 预算用尽
 * @returns 裁剪后的历史（按时间升序）和总 token 数
 */
export function trimHistoryByTokenBudget(
  history: { content: string }[],
  maxTokens: number
): { trimmed: typeof history; totalTokens: number } {
  let totalTokens = 0;
  let cutIndex = 0;

  // 从最新消息（数组末尾）往回计算
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokenCount(history[i].content);
    if (totalTokens + msgTokens > maxTokens) {
      cutIndex = i + 1;
      break;
    }
    totalTokens += msgTokens;
  }

  const trimmed = history.slice(cutIndex);
  return { trimmed, totalTokens };
}
