import './setup-env'; // 必须最先导入，以确保环境变量加载
import app from './app';

const PORT = process.env.PORT || 3001;

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
