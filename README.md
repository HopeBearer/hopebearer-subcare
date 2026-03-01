<div align="center">

<img src="apps/web/public/images/logo.png" alt="SubCare Logo" width="120" />

# 🧾 SubCare — 智能订阅管理平台

**集中管理你的所有订阅服务 · 费用统计 · 到期提醒 · AI 智能对话**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey?style=flat-square)](./LICENSE)

> 🎓 本项目用于展示前端 / 全栈开发能力与完整项目经验，仅供学习与技术交流。
>
> ⭐ 如果对你有帮助或启发，欢迎点个 Star 支持！

</div>

---

## 📖 简介

作为开发者和数字工作者，我们日常依赖大量订阅制服务 —— GitHub Copilot、JetBrains、ChatGPT Plus、Netflix、Spotify、iCloud……这些服务分散在不同平台，续费周期各异，币种不同，经常不知不觉就被"悄悄扣款"。

**SubCare** 正是为解决这个痛点而生的一站式订阅管理平台。

## ✨ 功能亮点

<table>
<tr>
<td width="50%">

### 📋 订阅管理
- 分步表单新增 / 编辑 / 删除订阅
- 预设热门服务模板，一键录入（含图标、默认价格等）
- 支持月付 / 年付 / 一次性等多种周期
- 自定义分类与标签管理
- 订阅详情抽屉（扣款历史、通知状态、操作栏）
- 状态追踪：活跃 / 已暂停 / 已取消

</td>
<td width="50%">

### 📊 数据看板 & 财务分析
- 仪表盘统计卡片（月度支出、活跃订阅数、预算余量）
- 支出趋势折线图 / 分类占比饼图（ECharts）
- 消费热力图（年度 Heatmap）
- 支出流向桑基图（Sankey）
- 未来支出预测 & 订阅模拟器
- 价格异常检测时间线
- 交易历史表格（分页查询）
- 多币种自动换算（实时汇率接口）

</td>
</tr>
<tr>
<td>

### 🤖 AI Chat & 智能推荐
- 内置 AI 对话助手（流式输出 / Markdown 渲染）
- 多轮对话 + 会话历史管理（侧边栏列表）
- 支持工具调用（Tool Call）展示
- 多 AI 供应商集成（OpenAI / DeepSeek / OpenRouter 等）
- 仪表盘 AI 智能订阅优化建议（WebSocket 实时推送）
- 基于语义向量的订阅模板搜索

</td>
<td>

### 🔔 通知 & 提醒
- 续费前 N 天邮件提醒（可按订阅独立配置）
- 站内通知中心（实时推送 + 已读/未读管理）
- 通知偏好设置（按类别分 Email / 站内信开关）
- 消息模板管理（管理员可自定义）
- WebSocket 实时通知推送

</td>
</tr>
<tr>
<td>

### 🔐 用户系统
- 邮箱注册 / 登录（图形验证码）
- JWT 双 Token 认证（Access + Refresh）
- 忘记密码 / 邮箱重置密码
- 个人资料 / 偏好设置（默认币种、语言、主题）
- API Key 管理（用于 AI 供应商）
- 用户反馈系统（Bug / 建议 / 问题工单）

</td>
<td>

### 🛡️ 管理后台（Admin）
- 运营仪表盘（用户增长趋势、订阅统计、支付数据）
- 用户管理 / 登录安全监控
- 分类 / 订阅模板 / 消息模板管理
- 支付记录 / 汇率数据管理
- AI 对话监控 & 搜索用量分析
- API 请求分析面板
- 反馈工单处理 / 定时任务管理
- 系统日志 / 系统设置

</td>
</tr>
<tr>
<td colspan="2">

### 🌐 其他特性
- **国际化**：中文 / English / 日本語 三语切换
- **暗色模式**：全局 Dark Mode 支持
- **Docker 一键部署**：Docker Compose 编排（Next.js + Express + MySQL + Nginx）
- **Monorepo 架构**：TurboRepo + pnpm Workspaces，前后端共享类型与工具

</td>
</tr>
</table>

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                        Nginx                            │
│                   (反向代理 / 负载均衡)                    │
├──────────────────────┬──────────────────────────────────┤
│   apps/web (前端)     │        apps/api (后端)            │
│   Next.js 16         │        Express + TypeScript       │
│   React 19           │        分层架构                    │
│   UnoCSS             │   Controller → Service → Repo     │
│   Shadcn/UI          │        Prisma ORM                 │
│   Zustand            │        JWT 双 Token 认证           │
│   ECharts            │        WebSocket (Socket.io)      │
│   TanStack Query     │        Node-Cron 定时任务          │
│   i18next            │        Nodemailer 邮件服务          │
├──────────────────────┴──────────────────────────────────┤
│                      packages/ (共享)                     │
│   database (Prisma)  ·  types (DTO/Zod)  ·  utils        │
│   eslint-config  ·  tsconfig                             │
├─────────────────────────────────────────────────────────┤
│                  MySQL 8  ·  Docker Compose               │
└─────────────────────────────────────────────────────────┘
```

### 🛠 技术栈一览

| 层级 | 技术 |
|------|------|
| **Monorepo** | TurboRepo + pnpm Workspaces |
| **前端** | Next.js 16, React 19, UnoCSS, Shadcn/UI, Zustand, TanStack Query, ECharts, i18next |
| **后端** | Express 4, TypeScript 5, JWT, Socket.io, Node-Cron, Nodemailer, Zod |
| **数据库** | MySQL 8 + Prisma 5 ORM |
| **AI** | 多供应商 LLM 集成, @xenova/transformers (语义向量), Tavily (联网搜索) |
| **部署** | Docker Compose, Nginx, GitHub Actions CI/CD |
| **代码规范** | ESLint, Prettier, 统一 Monorepo 配置 |

## 📂 项目结构

```
subcare/
├── apps/
│   ├── web/                    # 🖥️ Next.js 前端应用
│   │   ├── src/
│   │   │   ├── app/            # App Router 页面 (home / admin / auth 三组)
│   │   │   ├── components/     # UI 组件 (ui/ + features/ + layout/)
│   │   │   ├── services/       # API 调用层
│   │   │   ├── store/          # Zustand 状态管理
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   └── lib/            # 工具函数 & i18n
│   │   └── public/             # 静态资源 & 多语言 JSON
│   │
│   └── api/                    # ⚙️ Express 后端服务
│       └── src/
│           ├── controllers/    # 请求处理 (版本化: v1/v2)
│           ├── services/       # 业务逻辑 (含 AI Chat / Agent / 异常检测)
│           ├── repositories/   # 数据访问层
│           ├── middleware/      # 认证 / 权限 / 日志
│           ├── config/         # 路由注册 / 版本化配置
│           ├── jobs/           # 定时任务 (续费提醒 / 账单生成)
│           └── infrastructure/ # 基础设施 (邮件 / AI / WebSocket)
│
├── packages/
│   ├── database/               # 🗄️ Prisma Schema & Client
│   ├── types/                  # 📝 共享 TypeScript 类型 / Zod Schema
│   ├── utils/                  # 🔧 共享工具函数
│   ├── eslint-config/          # 📏 ESLint 配置
│   └── tsconfig/               # ⚙️ TypeScript 配置
│
├── docker/                     # 🐳 Nginx 等 Docker 配置
├── docker-compose.yml          # 一键部署编排
├── turbo.json                  # TurboRepo 配置
└── pnpm-workspace.yaml         # Workspace 定义
```

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 |
|------|---------|
| [Node.js](https://nodejs.org/) | >= 20.9.0（推荐 22.x） |
| [pnpm](https://pnpm.io/) | 8.15.4 |
| MySQL | 8.x |

### 1️⃣ 克隆仓库

```bash
git clone https://github.com/your-username/subcare.git
cd subcare
```

### 2️⃣ 安装依赖

```bash
pnpm install
```

### 3️⃣ 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# ==================== 数据库 ====================
DATABASE_URL="mysql://root:password@localhost:3306/subcare"

# ==================== 后端服务 ====================
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# ==================== JWT 密钥 ====================
JWT_ACCESS_SECRET="your-super-secret-access-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# ==================== 邮件服务（可选）====================
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"
EMAIL_FROM='"SubCare" <no-reply@subcare.app>'
```

### 4️⃣ 初始化数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 推送数据库结构
pnpm db:push

# （可选）可视化数据库管理
pnpm db:studio
```

### 5️⃣ 启动开发环境

```bash
pnpm dev
```

启动完成后访问：

| 服务 | 地址 |
|------|------|
| 🖥️ 前端 | [http://localhost:3000](http://localhost:3000) |
| ⚙️ 后端 API | [http://localhost:3001](http://localhost:3001) |

### 🐳 Docker 部署

项目提供完整的 Docker Compose 配置，可一键部署至服务器：

```bash
docker compose up -d
```

包含服务：Next.js 前端 + Express 后端 + MySQL 8 + Nginx 反向代理

## 🌍 在线演示

| | 信息 |
|------|------|
| 🔗 **演示地址** | [http://38.22.90.133](http://38.22.90.133) |
| 👤 **体验账号** | 账号：`test123` &nbsp;&nbsp; 密码：`Test123456.` |

> ⚠️ 演示环境数据会定期重置，请勿存储重要信息。

<!-- 
如果需要补充截图，可在下方添加：

## 📸 项目截图

| 仪表盘 | 订阅管理 |
|:---:|:---:|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Subscriptions](./docs/screenshots/subscriptions.png) |

| AI 智能对话 | 财务分析 |
|:---:|:---:|
| ![AI Chat](./docs/screenshots/ai-chat.png) | ![Finance](./docs/screenshots/finance.png) |

| 管理后台 | 暗色模式 |
|:---:|:---:|
| ![Admin](./docs/screenshots/admin-dashboard.png) | ![Dark Mode](./docs/screenshots/dark-mode.png) |
-->

## 🗺️ 开发路线

- [x] 用户认证系统（注册 / 登录 / 双 Token / 忘记密码）
- [x] 订阅 CRUD（分步表单 / 详情抽屉 / 扣款历史）
- [x] 预设订阅服务模板库（语义向量搜索）
- [x] 费用统计仪表盘（ECharts 图表）
- [x] 财务分析中心（热力图 / 桑基图 / 支出预测 / 异常检测）
- [x] 多币种汇率自动换算
- [x] 邮件 & 站内通知提醒系统
- [x] AI Chat 智能对话（多轮流式对话 / 工具调用 / 会话管理）
- [x] AI 智能订阅优化建议（WebSocket 实时推送）
- [x] 用户反馈系统（Bug / 建议 / 问题工单）
- [x] 中文 / English / 日本語 国际化
- [x] 暗色模式
- [x] 管理后台（17+ 管理页面）
- [x] Docker Compose 一键部署
- [ ] 第三方登录（GitHub / Google）
- [ ] 数据导出（CSV / PDF）
- [ ] 移动端适配优化
- [ ] 更多提醒渠道（钉钉 / 飞书 / Webhook）

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

> 💡 项目采用 Monorepo 架构，开发环境为 Windows，请确保脚本命令兼容 PowerShell。

## ⭐ Star History

如果这个项目对你有帮助，请 Star 支持一下 ✨

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/subcare&type=Date)](https://star-history.com/#your-username/subcare&Date)

## 📄 许可证

本项目基于 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 协议开源。

## 📬 联系方式

- 📧 Email: [hopebearer666@gmail.com](mailto:hopebearer666@gmail.com)
- 🐛 Issue: [GitHub Issues](https://github.com/hopebearer/subcare/issues)

---

<div align="center">

**如果觉得项目不错，请给个 ⭐ Star 支持一下吧！**

Made with ❤️ by [HopeBearer]

</div>
