'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Brain, CheckCircle2 } from 'lucide-react';
import { BotAvatar } from './avatars';
import { ToolCallInline, ToolCallHistoryItem } from './tool-call-inline';
import { MarkdownRenderer } from './markdown-renderer';

// Streaming message component - single avatar with all content inside bubble
interface StreamingMessageProps {
  content: string;
  toolCalls: ToolCallHistoryItem[];
  thinkingSteps?: string[];
}

/**
 * StreamingMessage
 * 
 * 布局：思考步骤 → 工具调用 → 分割线 → 内容
 * 与 ChatMessage 完成后布局完全一致（工具调用始终在内容上方），避免视觉跳变。
 * 
 * 性能优化：
 * - memo() 避免父组件 re-render 导致的无效重绘
 * - markdown-it 宽松解析器 + 全量重渲染（~0.5ms/2K字，无需 useDeferredValue）
 * - content 和 toolCalls 由 RAF flush 控制频率（≤60fps）
 */
export const StreamingMessage = memo(function StreamingMessage({ content, toolCalls, thinkingSteps = [] }: StreamingMessageProps) {
  const { t } = useTranslation('common');
  
  const hasActiveToolCall = toolCalls.some(tc => tc.status === 'started');
  const hasContent = content.trim().length > 0;
  const hasThinkingSteps = thinkingSteps.length > 0;
  const hasMetadata = hasThinkingSteps || toolCalls.length > 0;
  const showInitialThinking = !hasContent && !hasActiveToolCall && toolCalls.length === 0 && !hasThinkingSteps;

  return (
    <div className="flex gap-4 py-4 px-4">
      {/* Single bot avatar */}
      <BotAvatar isThinking={hasActiveToolCall || showInitialThinking || (hasThinkingSteps && !hasContent)} />
      
      {/* Message bubble containing everything */}
      <div className="max-w-[80%] md:max-w-[70%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm space-y-2">
        
        {/* 思考步骤 + 工具调用区域（始终在内容上方，与 ChatMessage 一致） */}
        {hasMetadata && (
          <div className="space-y-2">
            {/* ReAct 思考步骤 — 持久累积显示 */}
            {hasThinkingSteps && (
              <div className="space-y-1">
                {thinkingSteps.map((step, index) => {
                  const isLatest = index === thinkingSteps.length - 1;
                  const isActive = isLatest && !hasContent;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 text-xs ${
                        isActive 
                          ? 'text-violet-600 dark:text-violet-400' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {isActive ? (
                        <Brain className="w-3 h-3 animate-pulse flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className={isActive ? 'italic' : ''}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 工具调用 */}
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
            
            {/* 分割线（有内容时才显示） */}
            {hasContent && (
              <div className="border-t border-gray-200 dark:border-gray-700" />
            )}
          </div>
        )}
        
        {/* 流式内容 — markdown-it 宽松解析，全量重渲染 */}
        {hasContent && (
          <MarkdownRenderer content={content} streaming />
        )}
        
        {/* 初始思考动画（没有任何状态时显示） */}
        {showInitialThinking && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">{t('chat.thinking')}</span>
          </div>
        )}
        
        {/* 等待工具结果 */}
        {hasActiveToolCall && !hasContent && (
          <div className="flex items-center gap-2 text-gray-400 text-xs pt-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t('chat.waiting_tool')}</span>
          </div>
        )}
      </div>
    </div>
  );
});
