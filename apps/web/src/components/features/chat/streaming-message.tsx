'use client';

import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BotAvatar } from './avatars';
import { ToolCallInline, ToolCallHistoryItem } from './tool-call-inline';

// Streaming message component - single avatar with all content inside bubble
interface StreamingMessageProps {
  content: string;
  toolCalls: ToolCallHistoryItem[];
}

export function StreamingMessage({ content, toolCalls }: StreamingMessageProps) {
  const { t } = useTranslation('common');
  
  const hasActiveToolCall = toolCalls.some(tc => tc.status === 'started');
  const hasContent = content.trim().length > 0;
  const showThinking = !hasContent && !hasActiveToolCall && toolCalls.length === 0;

  return (
    <div className="flex gap-4 py-4 px-4">
      {/* Single bot avatar */}
      <BotAvatar isThinking={hasActiveToolCall || showThinking} />
      
      {/* Message bubble containing everything */}
      <div className="max-w-[80%] md:max-w-[70%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm space-y-2">
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
        
        {/* Streaming content */}
        {hasContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p:last-child]:inline">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span>{children}</span>
              }}
            >
              {content}
            </ReactMarkdown>
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
          </div>
        )}
        
        {/* Thinking indicator (only when no tools and no content) */}
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
}
