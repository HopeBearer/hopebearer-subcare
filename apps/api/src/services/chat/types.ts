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
  type: 'chunk' | 'tool_call' | 'complete' | 'error' | 'title_updated' | 'thinking';
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
