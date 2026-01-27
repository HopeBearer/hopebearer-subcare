# SubCare - Subscription Management Platform

SubCare 是一个集中式订阅管理平台，旨在帮助用户跟踪和管理各种订阅服务（如 Cursor、Trae、Antigravity、GitHub Copilot、视频网站、音乐网站等）。它可以帮助你统计每月/每年的总支出，并在续费日前发送提醒，防止意外扣费。并可以通过AI推荐服务给出合理的优化订阅建议。

## ✨ 主要功能

*   **集中管理**：在一个看板上查看所有订阅服务。
*   **费用统计**：自动计算本月/本年的总花销，支持多币种。
*   **提醒通知**：在续费日前通过邮件/钉钉/飞书上发送提醒。
*   **语言切换**：支持中英文切换。
*   **AI推荐**： 

## 🛠 技术栈

本项目采用 Monorepo 架构，主要技术栈包括：

*   **包管理器**: [pnpm](https://pnpm.io/)
*   **构建工具**: [TurboRepo](https://turbo.build/)
*   **前端 (`apps/web`)**: Next.js 16(仅做前端服务), UnoCSS, Shadcn/UI, Zustand
*   **后端 (`apps/api`)**: Express, TypeScript
*   **数据库**: MySQL (Prisma ORM)

## 🚀 快速开始

### 1. 环境准备

确保你的开发环境已安装：

*   [Node.js](https://nodejs.org/) (>= 18, 推荐22.18.0)
*   [pnpm](https://pnpm.io/) (推荐版本 8+, 推荐8.15.4)
*   MySQL 数据库

### 2. 安装依赖

在项目根目录下运行：

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录下创建一个 `.env` 文件。你可以参考以下配置：

```env
# Database Configuration
# 格式: mysql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="mysql://root:password@localhost:3306/subcare"

# Backend Configuration (apps/api)
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# JWT Secrets (用于生成和验证 Token)
JWT_ACCESS_SECRET="your-super-secret-access-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# Email Configuration (用于发送提醒邮件)
# 如果不需要邮件功能，可以暂时留空或使用假数据
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE="false" # true for 465, false for other ports
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"
EMAIL_FROM='"SubCare" <no-reply@subcare.app>'
```

### 4. 数据库设置

生成 Prisma Client 并将 Schema 推送到数据库, 根目录执行：

```bash
# 生成 Prisma Client
pnpm db:generate

# 将数据库结构推送到数据库 (开发环境)
pnpm db:push
```

如果你想查看和管理数据库数据，可以运行 Prisma Studio：

```bash
pnpm db:studio
```

### 5. 启动项目

在根目录下运行以下命令同时启动前端和后端：

```bash
pnpm dev
```

*   **前端地址**: [http://localhost:3000](http://localhost:3000)
*   **后端地址**: [http://localhost:3001](http://localhost:3001)

## 📂 项目结构

```
.
├── apps
│   ├── api          # Express 后端应用
│   └── web          # Next.js 前端应用
├── packages
│   ├── database     # Prisma Schema 和 Client
│   ├── types        # 前后端共享的 TypeScript 类型
│   ├── eslint-config # 共享 ESLint 配置
│   └── tsconfig     # 共享 TSConfig 配置
└── package.json     # Root package.json
```
        