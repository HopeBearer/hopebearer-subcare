import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { VersionedRouter } from './core/router/VersionedRouter';
import { globalErrorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger';

// 创建 Express 应用实例
const app: Express = express();

// 应用全局中间件
app.use(helmet());            // 安全相关 HTTP 头
app.use(cors({
//   origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // 允许的前端域名
  credentials: true,            // 允许携带凭证（Cookie）
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 允许的方法
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] // 允许的请求头
}));              // 跨域资源共享
// app.use(morgan('dev'));       // HTTP 请求日志 - Replaced by our custom requestLogger
app.use(express.json());      // 解析 JSON 请求体

// Custom Request Logger
app.use(requestLogger);

// 注册 API 路由 (使用版本化路由)
const versionedRouter = new VersionedRouter();
app.use('/api', versionedRouter.getRouter());

// 注册全局错误处理中间件 (必须在路由之后)
app.use(globalErrorHandler);

export default app;
