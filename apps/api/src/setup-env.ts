// 引入必要的模块
import path from 'path';
import dotenv from 'dotenv';

// 计算根目录 .env 文件的路径
// apps/api/src/setup-env.ts -> apps/api/src -> apps/api -> apps -> root
// ../../../.env
// 解析出 .env 文件的绝对路径
const envPath = path.resolve(__dirname, '../../../.env');

// 加载环境变量
const result = dotenv.config({ path: envPath });

// 检查是否加载成功
if (result.error) {
  console.warn('⚠️  Warning: Could not load .env file from:', envPath);
  console.warn('   Error:', result.error.message);
} else {
  console.log('✅ Loaded environment variables from:', envPath);
}

// 验证关键环境变量 DATABASE_URL 是否存在
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in environment variables!');
} else {
  console.log('✅ DATABASE_URL is set.');
}
