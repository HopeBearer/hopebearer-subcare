import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { globalErrorHandler } from './middleware/error.middleware';

// 创建 Express 应用实例
const app: Express = express();

// 应用全局中间件
app.use(helmet());            // 安全相关 HTTP 头
app.use(cors());              // 跨域资源共享
app.use(morgan('dev'));       // HTTP 请求日志
app.use(express.json());      // 解析 JSON 请求体

// 注册 API 路由
app.use('/api', routes);

// 注册全局错误处理中间件 (必须在路由之后)
app.use(globalErrorHandler);

export default app;
