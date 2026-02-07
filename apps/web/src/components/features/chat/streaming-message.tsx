'use client';

import { memo, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BotAvatar } from './avatars';
import { ToolCallInline, ToolCallHistoryItem } from './tool-call-inline';

// Streaming message component - single avatar with all content inside bubble
interface StreamingMessageProps {
  content: string;
  toolCalls: ToolCallHistoryItem[];
  thinkingStep?: string | null;
}

/**
 * StreamingMessage
 * 
 * 性能优化：
 * - memo() 避免父组件 re-render 导致的无效重绘
 * - useDeferredValue 延迟 markdown 解析（低优先级）
 * - content 和 toolCalls 由 RAF flush 控制频率（≤60fps）
 */
export const StreamingMessage = memo(function StreamingMessage({ content, toolCalls, thinkingStep }: StreamingMessageProps) {
  const { t } = useTranslation('common');
  
  // 控制流使用原始 content（即时响应），仅 markdown 解析使用延迟值
  const deferredContent = useDeferredValue(content);
  
  const hasActiveToolCall = toolCalls.some(tc => tc.status === 'started');
  const hasContent = content.trim().length > 0; // ← 用原始值判断，避免延迟
  const showThinking = !hasContent && !hasActiveToolCall && toolCalls.length === 0 && !thinkingStep;

  return (
    <div className="flex gap-4 py-4 px-4">
      {/* Single bot avatar */}
      <BotAvatar isThinking={hasActiveToolCall || showThinking || !!thinkingStep} />
      
      {/* Message bubble containing everything */}
      <div className="max-w-[80%] md:max-w-[70%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm space-y-2">
        {/* ReAct thinking step indicator */}
        {thinkingStep && !hasContent && (
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm">
            <Brain className="w-3.5 h-3.5 animate-pulse" />
            <span className="italic">{thinkingStep}</span>
          </div>
        )}

        {/* Tool calls section */}
        {toolCalls.length > 0 && (
          <div className="space-y-1.5">
            {toolCalls.map((call) => (
              <ToolCallInline
                key={call.id}
                toolName={call.toolName}
                status={call.status}
              />
            ))}
          </div>
        )}
        
        {/* Divider between tools and content */}
        {toolCalls.length > 0 && hasContent && (
          <div className="border-t border-gray-200 dark:border-gray-700" />
        )}
        
        {/* Streaming content — markdown 解析使用 deferred value */}
        {hasContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p:last-child]:inline">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span>{children}</span>
              }}
            >
              {deferredContent}
            </ReactMarkdown>
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
          </div>
        )}
        
        {/* Thinking indicator (only when no tools and no content and no thinking step) */}
        {showThinking && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">{t('chat.thinking')}</span>
          </div>
        )}
        
        {/* Waiting for tool results (tools running but no content yet) */}
        {hasActiveToolCall && !hasContent && toolCalls.length > 0 && (
          <div className="flex items-center gap-2 text-gray-400 text-xs pt-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t('chat.waiting_tool')}</span>
          </div>
        )}
      </div>
    </div>
  );
});
