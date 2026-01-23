# 需求文档 (Product Requirements Document) - SubCare

## 1. 项目概况 (Project Overview)

### 1.1 背景 (Background)
作为程序员和数字化工作者，我们依赖大量的生产力工具（如 GitHub Copilot, JetBrains, Adobe Creative Cloud, Netflix, Spotify, AWS 等）。这些服务通常分散在不同的平台，且续费周期（月付/年付）、币种、扣款日期各不相同。用户难以直观地了解每月的总花销，常常面临被“悄悄”扣费或忘记取消订阅的困扰。

### 1.2 目标 (Goal)
构建一个名为 **SubCare** 的集中式订阅管理平台，帮助用户：
1.  **集中管理**：在一个看板上录入并查看所有订阅服务。
2.  **费用统计**：自动计算本月/本年的总花销，支持多币种转换（可选）。
3.  **提醒功能**：在续费日前发出提醒（邮件/站内信），防止意外扣费。

## 2. 用户角色 (User Roles)

- **普通用户 (User)**：注册账号，管理自己的订阅列表，查看统计报表。
- **管理员 (Admin)**：管理系统预设的服务模板（如预置 Netflix, ChatGPT 图标和默认价格），管理用户账号。

## 3. 功能需求 (Functional Requirements)

### 3.1 用户认证 (Authentication)
- **注册/登录**：支持邮箱/密码注册登录。
- **第三方登录 (可选)**：GitHub, Google 登录。
- **个人资料**：修改密码、头像、基础设置（默认币种）。

### 3.2 订阅管理 (Subscription Management)
- **新增订阅**：
  - 选择预设服务（如 ChatGPT Plus）或自定义服务名称。
  - 设置金额和币种（CNY, USD, etc.）。
  - 设置付款周期（月付、年付、一次性）。
  - 设置首次付款日期/下一次续费日期。
  - 添加备注/标签（如“工作”、“娱乐”）。
- **编辑/删除订阅**：修改金额、周期或删除不再使用的订阅。
- **状态管理**：标记订阅状态（活跃、已取消、试用期）。

### 3.3 仪表盘与统计 (Dashboard & Analytics)
- **总览卡片**：
  - 本月预估支出。
  - 年度预估支出。
  - 活跃订阅数量。
- **支出图表**：
  - 每月支出趋势图（柱状图/折线图）。
  - 订阅类别占比（饼图）。
- **日历视图**：在日历上标记每月的扣款日。

### 3.4 提醒通知 (Notifications) - *Phase 2*
- **续费提醒**：在扣款前 N 天（用户可配置）发送邮件提醒。
- **过期提醒**：提醒试用期即将结束。

## 4. 非功能需求 (Non-Functional Requirements)

### 4.1 技术栈规范 (遵循 Monorepo 规则)
- **前端 (`apps/web`)**: Next.js 16 (App Router), Tailwind CSS + Shadcn/UI, Zustand。
- **后端 (`apps/api`)**: Express + TypeScript, 分层架构。
- **数据库**: PostgreSQL (推荐) 或 SQLite (开发环境), 使用 Prisma ORM。
- **类型共享**: 严格使用 `@subcare/types` 进行前后端类型复用。

### 4.2 性能与体验
- **响应式设计**：完美适配桌面端和移动端浏览器。
- **加载速度**：首屏加载时间 < 1.5s。
- **数据一致性**：前端缓存与后端数据保持实时同步（React Query）。

### 4.3 安全性
- **数据加密**：用户密码加密存储 (bcrypt/argon2)。
- **API 安全**：JWT 认证，接口限流。

## 5. 数据模型设计草稿 (Data Model Draft)

### User
- `id`: UUID
- `email`: String
- `passwordHash`: String
- `currency`: String (默认币种)
- `createdAt`: DateTime

### Subscription
- `id`: UUID
- `userId`: UUID (FK -> User)
- `serviceName`: String (e.g., "Netflix")
- `iconUrl`: String?
- `price`: Decimal
- `currency`: String (e.g., "USD")
- `billingCycle`: Enum (MONTHLY, YEARLY, ONE_TIME)
- `startDate`: DateTime
- `nextBillingDate`: DateTime
- `status`: Enum (ACTIVE, CANCELLED, TRIAL)
- `category`: String? (e.g., "Productivity")
- `createdAt`: DateTime
- `updatedAt`: DateTime

## 6. 开发计划 (Roadmap)

### Phase 1: MVP (最小可行性产品)
- 用户注册/登录。
- 订阅列表的增删改查 (CRUD)。
- 简单的仪表盘：显示本月总支出。

### Phase 2: 增强体验
- 图表统计功能。
- 预设服务图标库。
- 多币种汇率换算。

### Phase 3: 通知与集成
- 邮件提醒系统。
- 导出数据 (CSV/PDF)。
