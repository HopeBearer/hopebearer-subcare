# AI Agent 智能对话功能 - 实现提示词文档

> 本文档包含 6 个阶段的详细提示词，用于在 SubCare 项目中实现 AI Agent 智能对话功能。
> 按顺序执行，每个阶段完成后验证再进入下一阶段。

---

## 📑 目录

- [项目背景](#项目背景)
- [Phase 1: 数据基础](#phase-1-数据基础)
- [Phase 2: 向量搜索](#phase-2-向量搜索)
- [Phase 3: Agent 工具扩展](#phase-3-agent-工具扩展)
- [Phase 4: Chat API 与 WebSocket](#phase-4-chat-api-与-websocket)
- [Phase 5: 前端 UI](#phase-5-前端-ui)
- [Phase 6: 优化与完善](#phase-6-优化与完善)

---

## 项目背景

| 技术栈     | 说明                                        |
| ---------- | ------------------------------------------- |
| 架构       | Monorepo (TurboRepo + pnpm)                 |
| 后端       | Express + TypeScript, 分层架构              |
| 前端       | Next.js 16 (App Router) + UnoCSS + Zustand  |
| 数据库     | MySQL + Prisma ORM                          |
| 实时通信   | Socket.io (已有实现)                        |
| 主题色     | Lavender (#A5A6F6)                          |
| 命名规范   | 文件 kebab-case, 组件 PascalCase            |

---

## Phase 1: 数据基础

### 任务目标

为 AI Agent 智能对话功能添加数据模型、Repository 层和种子数据。

### 1.1 更新 Prisma Schema

**文件**: `packages/database/prisma/schema.prisma`

添加以下模型：

```prisma
// ============================================
// 对话会话
// ============================================
model Conversation {
  id          String    @id @default(uuid())
  userId      String
  title       String    @default("New Chat")
  model       String?   // 可选：覆盖用户默认模型
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  
  user        User      @relation(fields: [userId], references: [id])
  messages    Message[]
  
  @@index([userId, updatedAt])
  @@map("conversations")
}

// ============================================
// 消息记录
// ============================================
model Message {
  id              String    @id @default(uuid())
  conversationId  String
  role            String    // 'user' | 'assistant' | 'system' | 'tool'
  content         String    @db.Text
  toolCalls       Json?
  toolCallId      String?
  tokenCount      Int?
  
  createdAt       DateTime  @default(now())
  
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId, createdAt])
  @@map("messages")
}

// ============================================
// 订阅服务模板
// ============================================
model SubscriptionTemplate {
  id              String   @id @default(uuid())
  name            String   @unique  // "Netflix"
  displayName     String?           // "Netflix 奈飞"
  searchText      String   @db.Text // 搜索关键词
  category        String?
  icon            String?
  website         String?
  pricingPlans    Json?    // { "CN": {...}, "US": {...} }
  defaultCurrency String   @default("CNY")
  defaultCycle    String   @default("monthly")
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("subscription_templates")
}
```

**同时更新 User 模型**：

```prisma
model User {
  // ... 现有字段 ...
  conversations Conversation[]  // 新增关联
}
```

### 1.2 创建 Repository 层

**目录**: `apps/api/src/repositories/`

| 文件名                        | 功能                              |
| ----------------------------- | --------------------------------- |
| `ConversationRepository.ts`   | CRUD、按用户ID查询、软删除        |
| `MessageRepository.ts`        | 创建消息、按会话ID分页查询        |
| `TemplateRepository.ts`       | 模糊搜索、按分类查询              |

**示例结构** (ConversationRepository.ts):

```typescript
export class ConversationRepository {
  async create(userId: string, data?: Partial<Conversation>): Promise<Conversation>;
  async findById(id: string): Promise<Conversation | null>;
  async findByUserId(userId: string, options?: PaginationOptions): Promise<Conversation[]>;
  async update(id: string, data: Partial<Conversation>): Promise<Conversation>;
  async softDelete(id: string): Promise<void>;
}
```

### 1.3 创建种子脚本

**文件**: `apps/api/scripts/seed-templates.ts`

**功能要求**:
- 包含 50+ 常见订阅服务 (Netflix, Spotify, iCloud, Office 365 等)
- 每个模板包含中英文别名、图标、参考价格
- 支持 `--clean` 参数清空重建

**示例数据结构**:

```typescript
const templates = [
  {
    name: 'Netflix',
    displayName: 'Netflix 奈飞',
    searchText: 'Netflix 网飞 奈飞 流媒体 视频 电影 电视剧',
    category: 'streaming',
    icon: '🎬',
    website: 'https://netflix.com',
    pricingPlans: {
      CN: { standard: 70, premium: 98 },
      US: { standard: 15.49, premium: 22.99 }
    }
  },
  // ... 更多模板
];
```

### 1.4 约束条件

- 文件名使用 kebab-case
- Repository 遵循现有模式 (参考 `SubscriptionRepository.ts`)
- 添加适当的索引优化查询性能
- 支持软删除 (deletedAt)

### 1.5 验证清单

- [ ] 运行 `pnpm db:generate` 成功
- [ ] 运行 `pnpm db:push` 成功
- [ ] 种子脚本 `pnpm tsx scripts/seed-templates.ts` 可正常执行
- [ ] 数据库中可查询到模板数据

---

## Phase 2: 向量搜索

### 任务目标

实现订阅模板的语义搜索功能，支持自然语言匹配。

### 2.1 创建向量服务接口

**文件**: `apps/api/src/infrastructure/vector/vector-service.interface.ts`

```typescript
export interface VectorSearchResult {
  templateId: string;
  name: string;
  score: number;
}

export interface IVectorService {
  search(query: string, topK?: number): Promise<VectorSearchResult[]>;
  upsert(templateId: string, name: string, searchText: string): Promise<void>;
  delete(templateId: string): Promise<void>;
}
```

### 2.2 实现 Embedding 服务

**文件**: `apps/api/src/infrastructure/vector/embedding.service.ts`

**功能**:
- 复用用户的 AI Provider (OpenAI) 生成 Embedding
- 使用 `text-embedding-3-small` 模型 (维度 1536)
- 如果用户未配置 OpenAI，Fallback 到关键词搜索

```typescript
export class EmbeddingService {
  async generateEmbedding(text: string, userApiKey?: string): Promise<number[]>;
  async batchGenerateEmbeddings(texts: string[], userApiKey?: string): Promise<number[][]>;
}
```

### 2.3 实现两种搜索策略

#### 策略 A: 内存向量搜索 (推荐)

**文件**: `apps/api/src/infrastructure/vector/memory-vector.service.ts`

```typescript
export class MemoryVectorService implements IVectorService {
  private vectors: Map<string, { embedding: number[], metadata: TemplateMetadata }>;
  
  // 启动时加载所有模板的 Embedding 到内存
  async initialize(): Promise<void>;
  
  // 余弦相似度搜索
  async search(query: string, topK = 5): Promise<VectorSearchResult[]>;
}
```

#### 策略 B: 关键词 Fallback

**文件**: `apps/api/src/infrastructure/vector/keyword-search.service.ts`

```typescript
import Fuse from 'fuse.js';

export class KeywordSearchService implements IVectorService {
  private fuse: Fuse<SubscriptionTemplate>;
  
  // 使用 Fuse.js 进行模糊匹配
  async search(query: string, topK = 5): Promise<VectorSearchResult[]>;
}
```

### 2.4 创建 Embedding 生成脚本

**文件**: `apps/api/scripts/generate-embeddings.ts`

```typescript
// 功能:
// - 为所有模板生成并存储 Embedding
// - 支持增量更新
// - 输出生成统计信息

// 使用: pnpm tsx scripts/generate-embeddings.ts [--force]
```

### 2.5 集成到应用启动

**文件**: `apps/api/src/index.ts`

```typescript
// 在应用启动时:
// 1. 初始化 VectorService
// 2. 加载模板向量到内存
// 3. 提供 VectorService 单例供其他服务使用
```

### 2.6 约束条件

- 不依赖 native 扩展 (避免 Windows 兼容问题)
- Embedding 维度 1536 (OpenAI text-embedding-3-small)
- 搜索结果返回 Top 5
- 缓存策略: 模板更新时自动重新生成 Embedding

### 2.7 验证清单

- [ ] 输入 "网飞" 能匹配到 Netflix
- [ ] 输入 "音乐" 能匹配到 Spotify、Apple Music 等
- [ ] Fallback 搜索在无 AI 配置时正常工作
- [ ] 搜索响应时间 < 100ms

---

## Phase 3: Agent 工具扩展

### 任务目标

扩展 AI Agent 工具集以支持智能对话场景下的订阅管理。

### 3.1 扩展 ToolDefinitions

**文件**: `apps/api/src/infrastructure/ai/tools/ToolDefinitions.ts`

添加以下 5 个工具定义：

#### 工具 1: lookup_subscription_service

```typescript
{
  type: 'function',
  function: {
    name: 'lookup_subscription_service',
    description: '通过语义搜索识别订阅服务，返回服务的预设信息。支持名称、别名、描述等多种输入。示例: "网飞" → Netflix, "音乐会员" → Spotify',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '用户描述的服务名称或特征'
        }
      },
      required: ['query']
    }
  }
}
```

#### 工具 2: quick_add_subscription

```typescript
{
  type: 'function',
  function: {
    name: 'quick_add_subscription',
    description: '快速添加订阅，智能补全缺失信息。如果用户没有提供价格，会自动从模板获取。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '服务名称' },
        price: { type: 'number', description: '价格 (可选)' },
        currency: { type: 'string', description: '货币 (可选, 默认用户货币)' },
        billingCycle: { 
          type: 'string', 
          enum: ['monthly', 'yearly', 'weekly', 'daily'],
          description: '计费周期 (可选, 默认 monthly)'
        },
        categoryId: { type: 'string', description: '分类ID (可选)' },
        website: { type: 'string', description: '网站 (可选)' },
        icon: { type: 'string', description: '图标 (可选)' }
      },
      required: ['name']
    }
  }
}
```

#### 工具 3: search_my_subscriptions

```typescript
{
  type: 'function',
  function: {
    name: 'search_my_subscriptions',
    description: '搜索用户的订阅。支持自然语言查询。示例: "流媒体类的订阅"、"最贵的订阅"、"下个月要付款的"',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索条件' },
        filters: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'CANCELLED'] },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' }
          }
        }
      },
      required: ['query']
    }
  }
}
```

#### 工具 4: cancel_subscription

```typescript
{
  type: 'function',
  function: {
    name: 'cancel_subscription',
    description: '取消/删除订阅，支持名称或ID',
    parameters: {
      type: 'object',
      properties: {
        nameOrId: { type: 'string', description: '订阅名称或ID' },
        hardDelete: { type: 'boolean', description: '是否永久删除 (默认 false = 软删除)' }
      },
      required: ['nameOrId']
    }
  }
}
```

#### 工具 5: get_spending_summary

```typescript
{
  type: 'function',
  function: {
    name: 'get_spending_summary',
    description: '获取用户订阅支出摘要统计',
    parameters: {
      type: 'object',
      properties: {
        period: { 
          type: 'string', 
          enum: ['this_month', 'last_month', 'this_year'],
          description: '统计周期'
        }
      }
    }
  }
}
```

### 3.2 扩展 ToolExecutor

**文件**: `apps/api/src/infrastructure/ai/tools/ToolExecutor.ts`

添加新工具的执行逻辑:

| 工具名                        | 调用服务                                      |
| ----------------------------- | --------------------------------------------- |
| `lookup_subscription_service` | `VectorService.search()`                      |
| `quick_add_subscription`      | `SubscriptionService.create()` + 模板补全     |
| `search_my_subscriptions`     | `SubscriptionRepository` + 自然语言过滤       |
| `cancel_subscription`         | `SubscriptionService.cancel()`                |
| `get_spending_summary`        | `DashboardService.getStats()`                 |

### 3.3 创建对话专用 System Prompt

**文件**: `apps/api/src/services/prompts/chat-system-prompt.ts`

```typescript
export const CHAT_SYSTEM_PROMPT = `
You are SubCare AI, an intelligent subscription management assistant.

## Core Principle: MINIMAL INTERACTION
- NEVER ask for information you can infer or look up
- Use lookup_subscription_service to get service details
- Use smart defaults for missing fields

## Decision Tree:

### User wants to ADD subscription:
1. Extract service name from input
2. Call lookup_subscription_service(name)
3. IF found → Use template defaults + user-provided overrides
4. IF not found → Call search_web for pricing
5. IF still unknown → Ask ONLY for: name + price
6. Call quick_add_subscription with all info

### User wants to QUERY subscriptions:
1. Call search_my_subscriptions with their query
2. Present results clearly

### User wants to CANCEL/DELETE:
1. Call search_my_subscriptions to find it
2. Confirm the specific subscription
3. Call cancel_subscription

## Smart Defaults:
- start_date: Today
- status: ACTIVE
- currency: User's preference
- billingCycle: monthly (unless specified)
- autoRenewal: true

## Response Guidelines:
1. Be concise - No unnecessary questions
2. Confirm actions - Show what was created/changed
3. Use user's language (auto-detect)
4. Format with markdown where helpful
`;
```

### 3.4 约束条件

- 遵循现有 ToolExecutor 模式
- 工具执行需要 userId 上下文
- 错误返回 JSON 格式: `{ error: string, message: string }`

### 3.5 验证清单

- [ ] "加个网飞" → 自动识别 Netflix 并创建订阅
- [ ] "取消 Spotify" → 找到并取消该订阅
- [ ] "我花了多少钱" → 返回本月支出统计
- [ ] 未知服务时能进行 Web 搜索

---

## Phase 4: Chat API 与 WebSocket

### 任务目标

实现完整的对话 REST API 与 WebSocket 实时消息通信。

### 4.1 创建 ChatService

**文件**: `apps/api/src/services/ChatService.ts`

```typescript
export class ChatService {
  constructor(
    private conversationRepo: ConversationRepository,
    private messageRepo: MessageRepository,
    private agentService: AgentService
  ) {}

  /**
   * 创建新对话
   */
  async createConversation(userId: string): Promise<Conversation>;

  /**
   * 发送消息并获取 AI 回复 (支持流式回调)
   */
  async sendMessage(params: {
    conversationId: string;
    userId: string;
    content: string;
    onChunk?: (chunk: string) => void;
    onToolCall?: (toolName: string) => void;
  }): Promise<Message>;

  /**
   * 加载对话历史
   */
  async getHistory(
    conversationId: string, 
    userId: string, 
    options?: { limit?: number; before?: string }
  ): Promise<Message[]>;

  /**
   * 获取用户对话列表
   */
  async listConversations(userId: string): Promise<Conversation[]>;

  /**
   * 更新对话
   */
  async updateConversation(
    conversationId: string, 
    userId: string, 
    data: { title?: string }
  ): Promise<Conversation>;

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void>;

  /**
   * 自动生成对话标题 (私有方法)
   */
  private async generateTitle(conversationId: string, firstMessage: string): Promise<void>;
}
```

### 4.2 创建 ChatController

**文件**: `apps/api/src/controllers/v1/ChatController.ts`

| HTTP 方法 | 端点                               | 功能           |
| --------- | ---------------------------------- | -------------- |
| POST      | `/chat/conversations`              | 创建新对话     |
| GET       | `/chat/conversations`              | 获取对话列表   |
| GET       | `/chat/conversations/:id`          | 获取对话详情   |
| PATCH     | `/chat/conversations/:id`          | 更新对话标题   |
| DELETE    | `/chat/conversations/:id`          | 删除对话       |
| GET       | `/chat/conversations/:id/messages` | 获取消息列表   |

### 4.3 扩展 SocketService

**文件**: `apps/api/src/infrastructure/socket/socket.service.ts`

添加对话 WebSocket 事件：

#### Client → Server 事件

```typescript
// 发送消息
socket.emit('chat:message:send', {
  conversationId: string,
  content: string
});
```

#### Server → Client 事件

```typescript
// 流式内容块
socket.emit('chat:message:chunk', {
  conversationId: string,
  chunk: string
});

// 工具调用通知
socket.emit('chat:message:tool_call', {
  conversationId: string,
  toolName: string,
  status: 'started' | 'completed'
});

// 消息完成
socket.emit('chat:message:complete', {
  conversationId: string,
  message: Message
});

// 错误
socket.emit('chat:message:error', {
  conversationId: string,
  code: string,
  message: string
});
```

### 4.4 更新路由配置

**文件**: `apps/api/src/config/route-config.ts`

```typescript
// Chat
'POST /chat/conversations': 'v1',
'GET /chat/conversations': 'v1',
'GET /chat/conversations/:id': 'v1',
'PATCH /chat/conversations/:id': 'v1',
'DELETE /chat/conversations/:id': 'v1',
'GET /chat/conversations/:id/messages': 'v1',
```

### 4.5 集成到 Container

**文件**: `apps/api/src/core/container.ts`

注册 ChatService、ChatController 依赖注入。

### 4.6 约束条件

- 遵循现有 Controller/Service 分层模式
- WebSocket 需要认证 (复用现有 token 认证)
- 消息限制: 单条消息 ≤ 8000 字符
- 对话历史加载限制: 最近 50 条

### 4.7 验证清单

- [ ] REST API 可正常 CRUD 对话
- [ ] WebSocket 连接后发送消息可实时收到流式响应
- [ ] Tool 调用时有进度通知
- [ ] 错误情况返回正确的错误码

---

## Phase 5: 前端 UI

### 任务目标

实现完整的对话界面，包括侧边栏、消息列表、输入框等组件。

### 5.1 创建页面路由

**目录结构**:

```
apps/web/src/app/(home)/chat/
├── layout.tsx          # 侧边栏 + 主区域布局
├── page.tsx            # 空状态/新对话引导
└── [id]/
    └── page.tsx        # 具体对话页面
```

### 5.2 创建 Zustand Store

**文件**: `apps/web/src/store/modules/chat.ts`

```typescript
import { create } from 'zustand';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: any[];
  createdAt: string;
}

interface ChatState {
  // 状态
  conversations: Conversation[];
  currentId: string | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  // Actions
  fetchConversations: () => Promise<void>;
  createConversation: () => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  
  // WebSocket Actions
  sendMessage: (content: string) => void;
  appendChunk: (chunk: string) => void;
  setToolCall: (toolName: string) => void;
  completeMessage: (message: Message) => void;
  setError: (error: string) => void;
  clearStreaming: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // ... 实现
}));
```

### 5.3 创建 Chat Service

**文件**: `apps/web/src/services/modules/chat.ts`

```typescript
import { api } from '@/lib/api';

export const chatService = {
  // 获取对话列表
  getConversations: () => 
    api.get('/chat/conversations'),

  // 创建新对话
  createConversation: () => 
    api.post('/chat/conversations'),

  // 获取对话消息
  getMessages: (id: string, params?: { limit?: number; before?: string }) => 
    api.get(`/chat/conversations/${id}/messages`, { params }),

  // 更新对话标题
  updateTitle: (id: string, title: string) => 
    api.patch(`/chat/conversations/${id}`, { title }),

  // 删除对话
  deleteConversation: (id: string) => 
    api.delete(`/chat/conversations/${id}`),
};
```

### 5.4 创建 UI 组件

**目录**: `apps/web/src/components/features/chat/`

#### chat-sidebar.tsx

对话列表侧边栏:

- 新建对话按钮 (Lavender 主题色)
- 对话列表 (按时间分组: 今天、昨天、更早)
- 悬停显示删除/重命名操作
- 当前对话高亮

#### chat-message.tsx

单条消息组件:

- 用户消息: 右侧、Lavender 背景 (#A5A6F6)
- AI 消息: 左侧、灰色背景
- Markdown 渲染支持
- 复制按钮
- Tool 调用状态显示

#### chat-message-list.tsx

消息列表:

- 使用 `@tanstack/react-virtual` 虚拟滚动
- 自动滚动到底部
- 流式消息实时显示
- 加载更多历史

#### chat-input.tsx

输入框:

- 多行输入 (Shift+Enter 换行, Enter 发送)
- 发送按钮 (Lavender 主题色)
- 字符计数 (最大 8000)
- 发送中禁用状态

#### thinking-indicator.tsx

AI 思考状态:

- 三点动画
- Tool 调用名称显示
- 流式文字闪烁光标

### 5.5 WebSocket Hook

**文件**: `apps/web/src/hooks/use-chat-socket.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket';
import { useChatStore } from '@/store/modules/chat';

export function useChatSocket() {
  const { socket, isConnected } = useSocket();
  const { 
    currentId,
    appendChunk, 
    setToolCall,
    completeMessage, 
    setError 
  } = useChatStore();

  useEffect(() => {
    if (!socket) return;

    const handleChunk = ({ conversationId, chunk }) => {
      if (conversationId === currentId) {
        appendChunk(chunk);
      }
    };

    const handleToolCall = ({ conversationId, toolName }) => {
      if (conversationId === currentId) {
        setToolCall(toolName);
      }
    };

    const handleComplete = ({ conversationId, message }) => {
      if (conversationId === currentId) {
        completeMessage(message);
      }
    };

    const handleError = ({ conversationId, message }) => {
      if (conversationId === currentId) {
        setError(message);
      }
    };

    socket.on('chat:message:chunk', handleChunk);
    socket.on('chat:message:tool_call', handleToolCall);
    socket.on('chat:message:complete', handleComplete);
    socket.on('chat:message:error', handleError);

    return () => {
      socket.off('chat:message:chunk', handleChunk);
      socket.off('chat:message:tool_call', handleToolCall);
      socket.off('chat:message:complete', handleComplete);
      socket.off('chat:message:error', handleError);
    };
  }, [socket, currentId]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    socket?.emit('chat:message:send', { conversationId, content });
  }, [socket]);

  return { sendMessage, isConnected };
}
```

### 5.6 UI 设计规范

| 元素       | 规格                                        |
| ---------- | ------------------------------------------- |
| 主题色     | Lavender (#A5A6F6)                          |
| 侧边栏宽度 | 280px (桌面端)                              |
| 消息间距   | 16px                                        |
| 圆角       | 12px (消息气泡)                             |
| 动画       | 消息 fade-in, 流式输出光标闪烁              |
| 响应式     | < 768px 侧边栏可折叠                        |

### 5.7 约束条件

- 文件名 kebab-case
- 组件使用 forwardRef + 明确的 interface Props
- 遵循现有 UI 组件风格 (参考 `button.tsx`)
- 使用 lucide-react 图标

### 5.8 验证清单

- [ ] 可创建新对话并发送消息
- [ ] 流式响应实时显示
- [ ] 对话历史正确加载
- [ ] 深色模式正常工作
- [ ] 侧边栏对话列表正确排序

---

## Phase 6: 优化与完善

### 任务目标

优化用户体验、处理边缘情况、移动端适配、国际化支持。

### 6.1 错误处理

| 场景                   | 处理方式                              |
| ---------------------- | ------------------------------------- |
| AI 配置未完成          | 显示引导卡片，链接到设置页            |
| Token 限制超出         | 提示消息过长，显示当前字符数          |
| 网络断开               | 显示断开提示，自动重连                |
| WebSocket 断开         | 自动重连，最多重试 3 次               |
| API 调用失败           | Toast 提示，支持重试                  |
| AI 响应超时 (30s)      | 显示超时提示，支持重试                |

### 6.2 Loading 状态

```typescript
// 对话列表加载
<ChatSidebarSkeleton />

// 消息发送中
<ChatInput disabled={isStreaming} />

// AI 响应中
<ThinkingIndicator toolName={currentToolCall} />
```

### 6.3 移动端适配

```scss
// 断点: 768px (md)

// 侧边栏响应式
@media (max-width: 767px) {
  .chat-sidebar {
    position: fixed;
    left: -100%;
    transition: left 0.3s;
    
    &.open {
      left: 0;
    }
  }
}

// 输入框适配
// 移动端键盘弹出时自动调整布局
```

### 6.4 性能优化

| 优化项         | 实现方式                              |
| -------------- | ------------------------------------- |
| 消息列表       | @tanstack/react-virtual 虚拟滚动     |
| 对话列表缓存   | React Query staleTime 配置            |
| 搜索输入       | 防抖 300ms                            |
| 滚动事件       | 节流 16ms                             |
| 图片懒加载     | Intersection Observer                 |

### 6.5 i18n 支持

**更新翻译文件**: `apps/web/public/locales/*/common.json`

```json
{
  "chat": {
    "newChat": "New Chat",
    "placeholder": "Type a message...",
    "send": "Send",
    "thinking": "Thinking...",
    "toolCall": "Using {{tool}}...",
    "empty": {
      "title": "Start a conversation",
      "description": "Ask me anything about your subscriptions"
    },
    "configureAI": {
      "title": "AI not configured",
      "description": "Please configure an AI provider first",
      "action": "Go to Settings"
    },
    "error": {
      "timeout": "Response timeout, please try again",
      "network": "Network error, please check your connection",
      "unknown": "Something went wrong"
    }
  }
}
```

中文版本:

```json
{
  "chat": {
    "newChat": "新对话",
    "placeholder": "输入消息...",
    "send": "发送",
    "thinking": "思考中...",
    "toolCall": "正在使用 {{tool}}...",
    "empty": {
      "title": "开始对话",
      "description": "问我任何关于订阅的问题"
    },
    "configureAI": {
      "title": "AI 未配置",
      "description": "请先配置 AI 服务提供商",
      "action": "前往设置"
    },
    "error": {
      "timeout": "响应超时，请重试",
      "network": "网络错误，请检查连接",
      "unknown": "出错了"
    }
  }
}
```

### 6.6 快捷操作

| 功能           | 快捷键 / 操作                         |
| -------------- | ------------------------------------- |
| 新建对话       | Ctrl/Cmd + N                          |
| 发送消息       | Enter                                 |
| 换行           | Shift + Enter                         |
| 复制消息       | 点击复制按钮                          |
| 编辑标题       | 双击标题                              |
| 删除对话       | 侧边栏悬停显示删除按钮                |

### 6.7 约束条件

- 错误信息需支持 i18n
- 不添加额外依赖，复用现有库
- 移动端断点: 768px (md)
- 深色模式兼容

### 6.8 验证清单

- [ ] 在无 AI 配置时显示引导
- [ ] 网络断开后自动重连
- [ ] 移动端体验流畅
- [ ] 所有文案支持中英文切换
- [ ] 深色模式下 UI 正常显示
- [ ] 键盘快捷键正常工作

---

## 附录: 文件创建清单

### 后端 (apps/api)

```
src/
├── controllers/v1/
│   └── ChatController.ts           [Phase 4]
├── services/
│   ├── ChatService.ts              [Phase 4]
│   └── prompts/
│       └── chat-system-prompt.ts   [Phase 3]
├── repositories/
│   ├── ConversationRepository.ts   [Phase 1]
│   ├── MessageRepository.ts        [Phase 1]
│   └── TemplateRepository.ts       [Phase 1]
├── infrastructure/
│   ├── ai/tools/
│   │   ├── ToolDefinitions.ts      [Phase 3] (修改)
│   │   └── ToolExecutor.ts         [Phase 3] (修改)
│   ├── socket/
│   │   └── socket.service.ts       [Phase 4] (修改)
│   └── vector/
│       ├── vector-service.interface.ts   [Phase 2]
│       ├── embedding.service.ts          [Phase 2]
│       ├── memory-vector.service.ts      [Phase 2]
│       └── keyword-search.service.ts     [Phase 2]
├── config/
│   └── route-config.ts             [Phase 4] (修改)
└── scripts/
    ├── seed-templates.ts           [Phase 1]
    └── generate-embeddings.ts      [Phase 2]
```

### 前端 (apps/web)

```
src/
├── app/(home)/chat/
│   ├── layout.tsx                  [Phase 5]
│   ├── page.tsx                    [Phase 5]
│   └── [id]/
│       └── page.tsx                [Phase 5]
├── components/features/chat/
│   ├── chat-sidebar.tsx            [Phase 5]
│   ├── chat-message.tsx            [Phase 5]
│   ├── chat-message-list.tsx       [Phase 5]
│   ├── chat-input.tsx              [Phase 5]
│   └── thinking-indicator.tsx      [Phase 5]
├── services/modules/
│   └── chat.ts                     [Phase 5]
├── store/modules/
│   └── chat.ts                     [Phase 5]
├── hooks/
│   └── use-chat-socket.ts          [Phase 5]
└── public/locales/
    ├── en/common.json              [Phase 6] (修改)
    └── zh/common.json              [Phase 6] (修改)
```

### 数据库 (packages/database)

```
prisma/
└── schema.prisma                   [Phase 1] (修改)
```

---

## 使用说明

1. **按顺序执行**: Phase 1 → Phase 2 → ... → Phase 6
2. **每阶段验证**: 完成验证清单后再进入下一阶段
3. **复制提示词**: 将每个 Phase 的内容作为独立提示词使用
4. **参考约束**: 遵循项目的命名规范和代码风格
