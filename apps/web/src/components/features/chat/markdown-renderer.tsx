'use client';

import { memo, useMemo } from 'react';
import MarkdownIt from 'markdown-it';

/**
 * 宽松 Markdown 渲染器（基于 markdown-it）
 * 
 * 设计理念：
 * - 宽松解析：容忍流式过程中不完整的 Markdown（未闭合代码块、加粗等）
 * - 全量重渲染：markdown-it 解析 2K 字仅需 ~0.3-0.8ms，足以支撑 60fps
 * - dangerouslySetInnerHTML：绕过 React 虚拟 DOM 管线，直接更新 DOM
 * - 统一样式：流式和完成后使用同一套 CSS 类名，零格式跳变
 */

// 创建 markdown-it 实例（单例，避免每次渲染重建）
const md = new MarkdownIt({
  html: false,        // 禁止 HTML 标签（安全）
  linkify: true,      // 自动识别 URL
  typographer: false,  // 不做排版美化（保持 LLM 原始输出）
  breaks: true,       // 换行符转为 <br>（LLM 经常用单换行）
});

// 自定义渲染规则：为表格添加包裹容器（overflow-x-auto）
const defaultTableOpen = md.renderer.rules.table_open || 
  function(tokens, idx, options, _env, self) { return self.renderToken(tokens, idx, options); };

md.renderer.rules.table_open = function(tokens, idx, options, env, self) {
  return '<div class="chat-md-table-wrap">' + defaultTableOpen(tokens, idx, options, env, self);
};

const defaultTableClose = md.renderer.rules.table_close || 
  function(tokens, idx, options, _env, self) { return self.renderToken(tokens, idx, options); };

md.renderer.rules.table_close = function(tokens, idx, options, env, self) {
  return defaultTableClose(tokens, idx, options, env, self) + '</div>';
};

// 为代码块添加语言标识 class
md.renderer.rules.fence = function(tokens, idx, _options, _env, _self) {
  const token = tokens[idx];
  const lang = token.info ? token.info.trim() : '';
  const langClass = lang ? ` language-${lang}` : '';
  const escaped = md.utils.escapeHtml(token.content);
  return `<pre class="chat-md-code-block"><code class="chat-md-code${langClass}">${escaped}</code></pre>`;
};

// 为行内代码添加自定义 class
md.renderer.rules.code_inline = function(tokens, idx) {
  const escaped = md.utils.escapeHtml(tokens[idx].content);
  return `<code class="chat-md-code-inline">${escaped}</code>`;
};

interface MarkdownRendererProps {
  content: string;
  /** 是否为流式模式（显示光标） */
  streaming?: boolean;
  className?: string;
}

/**
 * 统一 Markdown 渲染组件
 * 
 * 用于 StreamingMessage 和 ChatMessage，确保视觉一致
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ 
  content, 
  streaming = false,
  className = '' 
}: MarkdownRendererProps) {
  // markdown-it 解析：即使在 60fps 下也足够快（~0.5ms/2K字）
  const html = useMemo(() => {
    if (!content.trim()) return '';
    return md.render(content);
  }, [content]);

  if (!html) return null;

  return (
    <div className={`chat-markdown prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {streaming && (
        <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
});
