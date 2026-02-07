'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Wrench } from 'lucide-react';
import { Message } from '@/services';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BotAvatar, UserAvatar } from './avatars';
import { SavedToolCallCard, SavedToolCall } from './tool-call-card';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const { t } = useTranslation('common');
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  // Tool messages are typically hidden
  if (isTool) {
    return null;
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-4 py-4 px-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isUser && <BotAvatar isThinking={isStreaming} />}

      {/* Message Content */}
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-primary text-white rounded-br-md" 
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom table styling
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-left font-medium">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5">
                    {children}
                  </td>
                ),
                // Code blocks
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  
                  if (isInline) {
                    return (
                      <code 
                        className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  
                  return (
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2">
                      <code className="text-xs font-mono" {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-2">
                    {children}
                  </ol>
                ),
                // Paragraphs
                p: ({ children }) => (
                  <p className="my-1.5 leading-relaxed">{children}</p>
                ),
                // Strong/Bold
                strong: ({ children }) => (
                  <strong className="font-semibold text-primary dark:text-primary-400">
                    {children}
                  </strong>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            
            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            )}
          </div>
        )}

        {/* Saved tool calls history */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <Wrench className="w-3 h-3" />
              <span>{t('tools.used_count', { count: message.toolCalls.length })}</span>
            </div>
            <div className="space-y-1.5">
              {(message.toolCalls as SavedToolCall[]).map((call, index) => (
                <SavedToolCallCard key={index} toolCall={call} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && <UserAvatar />}
    </div>
  );
}
