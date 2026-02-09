/**
 * Subscription Templates Seed Script
 * 
 * 导入 50+ 常见订阅服务模板到数据库
 * 
 * Usage:
 *   cd apps/api
 *   pnpm seed:templates
 * 
 * Options:
 *   --clean     清空现有数据后重新导入
 *   --dry-run   仅显示将要执行的操作，不实际修改数据库
 */

import '../src/setup-env';
import { prisma } from '@subcare/database';

// Parse command line arguments
const args = process.argv.slice(2);
const cleanMode = args.includes('--clean');
const dryRun = args.includes('--dry-run');

interface TemplateData {
  name: string;
  displayName: string;
  searchText: string;
  category: string;
  icon: string;
  website: string;
  pricingPlans: {
    CN?: { [plan: string]: number };
    US?: { [plan: string]: number };
  };
  defaultCurrency?: string;
  defaultCycle?: string;
}

// 100+ 常见订阅服务模板 (全球 + 中国本土)
const templates: TemplateData[] = [
  // ==================== 流媒体 Streaming ====================
  {
    name: 'Netflix',
    displayName: 'Netflix 奈飞',
    searchText: 'Netflix 网飞 奈飞 流媒体 视频 电影 电视剧 streaming',
    category: 'streaming',
    icon: '🎬',
    website: 'https://netflix.com',
    pricingPlans: {
      CN: { standard: 70, premium: 98 },
      US: { standard: 15.49, premium: 22.99 }
    }
  },
  {
    name: 'YouTube Premium',
    displayName: 'YouTube Premium 会员',
    searchText: 'YouTube Premium 油管会员 视频 Music 无广告',
    category: 'streaming',
    icon: '📺',
    website: 'https://youtube.com/premium',
    pricingPlans: {
      CN: { individual: 11.99, family: 17.99 },
      US: { individual: 13.99, family: 22.99 }
    }
  },
  {
    name: 'Disney+',
    displayName: 'Disney+ 迪士尼+',
    searchText: 'Disney+ 迪士尼 Disney Plus 流媒体 视频 电影',
    category: 'streaming',
    icon: '🏰',
    website: 'https://disneyplus.com',
    pricingPlans: {
      US: { standard: 7.99, premium: 13.99 }
    }
  },
  {
    name: 'HBO Max',
    displayName: 'HBO Max',
    searchText: 'HBO Max 流媒体 视频 电影 电视剧 streaming',
    category: 'streaming',
    icon: '🎭',
    website: 'https://max.com',
    pricingPlans: {
      US: { standard: 9.99, premium: 15.99 }
    }
  },
  {
    name: 'Amazon Prime Video',
    displayName: 'Amazon Prime Video',
    searchText: 'Amazon Prime Video 亚马逊 流媒体 视频',
    category: 'streaming',
    icon: '📦',
    website: 'https://primevideo.com',
    pricingPlans: {
      US: { monthly: 8.99 }
    }
  },
  {
    name: 'Apple TV+',
    displayName: 'Apple TV+',
    searchText: 'Apple TV+ 苹果 流媒体 视频 电影',
    category: 'streaming',
    icon: '🍎',
    website: 'https://tv.apple.com',
    pricingPlans: {
      CN: { monthly: 6.99 },
      US: { monthly: 9.99 }
    }
  },
  {
    name: 'Hulu',
    displayName: 'Hulu',
    searchText: 'Hulu 流媒体 视频 电影 电视剧 streaming',
    category: 'streaming',
    icon: '📺',
    website: 'https://hulu.com',
    pricingPlans: {
      US: { basic: 7.99, premium: 17.99 }
    }
  },
  {
    name: 'Paramount+',
    displayName: 'Paramount+',
    searchText: 'Paramount+ 派拉蒙 流媒体 视频 电影 streaming',
    category: 'streaming',
    icon: '⛰️',
    website: 'https://paramountplus.com',
    pricingPlans: {
      US: { essential: 5.99, premium: 11.99 }
    }
  },
  {
    name: 'Peacock',
    displayName: 'Peacock Premium',
    searchText: 'Peacock NBC 流媒体 视频 streaming',
    category: 'streaming',
    icon: '🦚',
    website: 'https://peacocktv.com',
    pricingPlans: {
      US: { premium: 5.99, plus: 11.99 }
    }
  },
  {
    name: 'Crunchyroll',
    displayName: 'Crunchyroll Premium',
    searchText: 'Crunchyroll 动漫 Anime 日本动画 streaming',
    category: 'streaming',
    icon: '🍥',
    website: 'https://crunchyroll.com',
    pricingPlans: {
      US: { fan: 7.99, mega: 9.99, ultimate: 14.99 }
    }
  },
  {
    name: 'Bilibili',
    displayName: 'Bilibili 大会员',
    searchText: 'Bilibili B站 哔哩哔哩 大会员 视频 番剧 动漫',
    category: 'streaming',
    icon: '📱',
    website: 'https://bilibili.com',
    pricingPlans: {
      CN: { monthly: 25, yearly: 148 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'iQiyi',
    displayName: '爱奇艺 VIP',
    searchText: '爱奇艺 iQiyi 视频 电影 电视剧 VIP会员',
    category: 'streaming',
    icon: '🎬',
    website: 'https://iqiyi.com',
    pricingPlans: {
      CN: { monthly: 22, yearly: 218 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Youku',
    displayName: '优酷 VIP',
    searchText: '优酷 Youku 视频 电影 电视剧 VIP会员',
    category: 'streaming',
    icon: '📺',
    website: 'https://youku.com',
    pricingPlans: {
      CN: { monthly: 25, yearly: 198 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Tencent Video',
    displayName: '腾讯视频 VIP',
    searchText: '腾讯视频 Tencent Video 视频 电影 电视剧 VIP会员',
    category: 'streaming',
    icon: '📺',
    website: 'https://v.qq.com',
    pricingPlans: {
      CN: { monthly: 20, yearly: 198 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Mango TV',
    displayName: '芒果TV VIP',
    searchText: '芒果TV Mango 湖南卫视 视频 综艺 VIP会员',
    category: 'streaming',
    icon: '🥭',
    website: 'https://mgtv.com',
    pricingPlans: {
      CN: { monthly: 19, yearly: 178 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Douyin',
    displayName: '抖音会员',
    searchText: '抖音 Douyin TikTok 短视频 直播 会员',
    category: 'streaming',
    icon: '🎵',
    website: 'https://douyin.com',
    pricingPlans: {
      CN: { monthly: 12 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Migu Video',
    displayName: '咪咕视频会员',
    searchText: '咪咕视频 Migu 中国移动 体育 足球 NBA',
    category: 'streaming',
    icon: '📺',
    website: 'https://miguvideo.com',
    pricingPlans: {
      CN: { monthly: 15, yearly: 158 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== 音乐 Music ====================
  {
    name: 'Spotify',
    displayName: 'Spotify 声破天',
    searchText: 'Spotify 声破天 音乐 Music streaming 流媒体',
    category: 'music',
    icon: '🎵',
    website: 'https://spotify.com',
    pricingPlans: {
      CN: { individual: 10, family: 15 },
      US: { individual: 10.99, family: 16.99 }
    }
  },
  {
    name: 'Apple Music',
    displayName: 'Apple Music 苹果音乐',
    searchText: 'Apple Music 苹果音乐 音乐 Music streaming',
    category: 'music',
    icon: '🎧',
    website: 'https://music.apple.com',
    pricingPlans: {
      CN: { individual: 11, family: 17 },
      US: { individual: 10.99, family: 16.99 }
    }
  },
  {
    name: 'QQ Music',
    displayName: 'QQ音乐 VIP',
    searchText: 'QQ音乐 腾讯音乐 Music 音乐 VIP会员 绿钻',
    category: 'music',
    icon: '🎵',
    website: 'https://y.qq.com',
    pricingPlans: {
      CN: { monthly: 15, yearly: 138 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'NetEase Music',
    displayName: '网易云音乐 VIP',
    searchText: '网易云音乐 NetEase Music 音乐 VIP会员 黑胶',
    category: 'music',
    icon: '☁️',
    website: 'https://music.163.com',
    pricingPlans: {
      CN: { monthly: 15, yearly: 138 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Kugou Music',
    displayName: '酷狗音乐 VIP',
    searchText: '酷狗音乐 Kugou Music 音乐 VIP会员',
    category: 'music',
    icon: '🎶',
    website: 'https://kugou.com',
    pricingPlans: {
      CN: { monthly: 15, yearly: 138 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Kuwo Music',
    displayName: '酷我音乐 VIP',
    searchText: '酷我音乐 Kuwo Music 音乐 VIP会员',
    category: 'music',
    icon: '🎤',
    website: 'https://kuwo.cn',
    pricingPlans: {
      CN: { monthly: 15, yearly: 138 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Tidal',
    displayName: 'Tidal HiFi',
    searchText: 'Tidal HiFi 无损音乐 Lossless Music streaming 高保真',
    category: 'music',
    icon: '🌊',
    website: 'https://tidal.com',
    pricingPlans: {
      US: { hifi: 10.99, hifiPlus: 19.99 }
    }
  },
  {
    name: 'Amazon Music',
    displayName: 'Amazon Music Unlimited',
    searchText: 'Amazon Music Unlimited 亚马逊音乐 streaming',
    category: 'music',
    icon: '🎵',
    website: 'https://music.amazon.com',
    pricingPlans: {
      US: { individual: 9.99, family: 16.99 }
    }
  },
  // ==================== 云存储 Cloud Storage ====================
  {
    name: 'iCloud+',
    displayName: 'iCloud+ 苹果云',
    searchText: 'iCloud Apple 苹果 云存储 Cloud storage 备份',
    category: 'cloud',
    icon: '☁️',
    website: 'https://icloud.com',
    pricingPlans: {
      CN: { '50GB': 6, '200GB': 21, '2TB': 68 },
      US: { '50GB': 0.99, '200GB': 2.99, '2TB': 10.99 }
    }
  },
  {
    name: 'Google One',
    displayName: 'Google One',
    searchText: 'Google One 谷歌 云存储 Cloud storage Google Drive',
    category: 'cloud',
    icon: '🔵',
    website: 'https://one.google.com',
    pricingPlans: {
      US: { '100GB': 1.99, '200GB': 2.99, '2TB': 9.99 }
    }
  },
  {
    name: 'Dropbox',
    displayName: 'Dropbox',
    searchText: 'Dropbox 云存储 Cloud storage 文件同步 备份',
    category: 'cloud',
    icon: '📦',
    website: 'https://dropbox.com',
    pricingPlans: {
      US: { plus: 11.99, professional: 19.99 }
    }
  },
  {
    name: 'OneDrive',
    displayName: 'OneDrive 微软云',
    searchText: 'OneDrive Microsoft 微软 云存储 Cloud storage',
    category: 'cloud',
    icon: '☁️',
    website: 'https://onedrive.com',
    pricingPlans: {
      CN: { '100GB': 9 },
      US: { '100GB': 1.99 }
    }
  },
  {
    name: 'Baidu Pan',
    displayName: '百度网盘 VIP',
    searchText: '百度网盘 Baidu Pan 云存储 Cloud storage 会员',
    category: 'cloud',
    icon: '💾',
    website: 'https://pan.baidu.com',
    pricingPlans: {
      CN: { monthly: 25, yearly: 178 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Aliyun Drive',
    displayName: '阿里云盘 VIP',
    searchText: '阿里云盘 Aliyun Drive 云存储 Cloud storage 会员',
    category: 'cloud',
    icon: '☁️',
    website: 'https://aliyundrive.com',
    pricingPlans: {
      CN: { monthly: 8, yearly: 96 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: '115 Cloud',
    displayName: '115网盘 VIP',
    searchText: '115网盘 115 Cloud 云存储 会员 大容量',
    category: 'cloud',
    icon: '💿',
    website: 'https://115.com',
    pricingPlans: {
      CN: { monthly: 30, yearly: 298 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Quark Cloud',
    displayName: '夸克网盘 VIP',
    searchText: '夸克网盘 Quark Cloud 云存储 UC 阿里 会员',
    category: 'cloud',
    icon: '☁️',
    website: 'https://pan.quark.cn',
    pricingPlans: {
      CN: { monthly: 18, yearly: 168 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== 生产力工具 Productivity ====================
  {
    name: 'Microsoft 365',
    displayName: 'Microsoft 365 / Office 365',
    searchText: 'Microsoft 365 Office 365 微软 Word Excel PowerPoint 办公软件',
    category: 'productivity',
    icon: '📊',
    website: 'https://microsoft365.com',
    pricingPlans: {
      CN: { personal: 398, family: 498 },
      US: { personal: 6.99, family: 9.99 }
    },
    defaultCycle: 'yearly'
  },
  {
    name: 'Notion',
    displayName: 'Notion',
    searchText: 'Notion 笔记 知识库 Wiki 项目管理 协作',
    category: 'productivity',
    icon: '📝',
    website: 'https://notion.so',
    pricingPlans: {
      US: { plus: 8, business: 15 }
    }
  },
  {
    name: 'Obsidian',
    displayName: 'Obsidian Sync',
    searchText: 'Obsidian 笔记 Markdown 知识库 同步',
    category: 'productivity',
    icon: '💎',
    website: 'https://obsidian.md',
    pricingPlans: {
      US: { sync: 4, publish: 8 }
    }
  },
  {
    name: 'Evernote',
    displayName: 'Evernote 印象笔记',
    searchText: 'Evernote 印象笔记 笔记 知识库 备忘录',
    category: 'productivity',
    icon: '🐘',
    website: 'https://evernote.com',
    pricingPlans: {
      CN: { standard: 68, premium: 118 },
      US: { personal: 7.99, professional: 14.99 }
    }
  },
  {
    name: 'Todoist',
    displayName: 'Todoist',
    searchText: 'Todoist 任务管理 待办事项 Todo GTD',
    category: 'productivity',
    icon: '✅',
    website: 'https://todoist.com',
    pricingPlans: {
      US: { pro: 4, business: 6 }
    }
  },
  {
    name: 'Canva',
    displayName: 'Canva Pro',
    searchText: 'Canva 设计 图片编辑 海报 PPT Design',
    category: 'productivity',
    icon: '🎨',
    website: 'https://canva.com',
    pricingPlans: {
      CN: { pro: 30 },
      US: { pro: 12.99 }
    }
  },
  {
    name: 'Figma',
    displayName: 'Figma Professional',
    searchText: 'Figma 设计 UI UX 原型 协作 Design',
    category: 'productivity',
    icon: '🖼️',
    website: 'https://figma.com',
    pricingPlans: {
      US: { professional: 12, organization: 45 }
    }
  },
  {
    name: 'Adobe Creative Cloud',
    displayName: 'Adobe Creative Cloud',
    searchText: 'Adobe CC Photoshop Illustrator Premiere 设计 视频编辑',
    category: 'productivity',
    icon: '🎨',
    website: 'https://adobe.com',
    pricingPlans: {
      CN: { all: 888 },
      US: { all: 54.99, photography: 9.99 }
    }
  },
  {
    name: 'Grammarly',
    displayName: 'Grammarly Premium',
    searchText: 'Grammarly 语法检查 写作 英语 Grammar',
    category: 'productivity',
    icon: '✍️',
    website: 'https://grammarly.com',
    pricingPlans: {
      US: { premium: 12, business: 15 }
    }
  },
  {
    name: 'WPS Office',
    displayName: 'WPS 超级会员',
    searchText: 'WPS Office 金山 办公 文档 会员 稻壳',
    category: 'productivity',
    icon: '📄',
    website: 'https://wps.cn',
    pricingPlans: {
      CN: { monthly: 19, yearly: 179 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Lark',
    displayName: '飞书会员',
    searchText: '飞书 Lark 字节跳动 办公 协作 文档 会议',
    category: 'productivity',
    icon: '🐦',
    website: 'https://feishu.cn',
    pricingPlans: {
      CN: { standard: 30, business: 60 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'DingTalk',
    displayName: '钉钉专业版',
    searchText: '钉钉 DingTalk 阿里 办公 协作 OA',
    category: 'productivity',
    icon: '📌',
    website: 'https://dingtalk.com',
    pricingPlans: {
      CN: { professional: 9800 }
    },
    defaultCurrency: 'CNY',
    defaultCycle: 'yearly'
  },
  {
    name: 'Yuque',
    displayName: '语雀会员',
    searchText: '语雀 Yuque 文档 知识库 笔记 阿里',
    category: 'productivity',
    icon: '📚',
    website: 'https://yuque.com',
    pricingPlans: {
      CN: { monthly: 11, yearly: 99 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Xmind',
    displayName: 'Xmind Pro',
    searchText: 'Xmind 思维导图 Mind Map 脑图 头脑风暴',
    category: 'productivity',
    icon: '🧩',
    website: 'https://xmind.app',
    pricingPlans: {
      CN: { yearly: 308 },
      US: { yearly: 59.99 }
    },
    defaultCycle: 'yearly'
  },
  {
    name: 'Linear',
    displayName: 'Linear',
    searchText: 'Linear 项目管理 Issue Tracker 开发 团队协作',
    category: 'productivity',
    icon: '📋',
    website: 'https://linear.app',
    pricingPlans: {
      US: { standard: 8, plus: 14 }
    }
  },
  // ==================== 密码管理 Password Managers ====================
  {
    name: '1Password',
    displayName: '1Password',
    searchText: '1Password 密码管理 Password Manager 安全',
    category: 'security',
    icon: '🔐',
    website: 'https://1password.com',
    pricingPlans: {
      US: { individual: 2.99, family: 4.99 }
    }
  },
  {
    name: 'LastPass',
    displayName: 'LastPass Premium',
    searchText: 'LastPass 密码管理 Password Manager 安全',
    category: 'security',
    icon: '🔒',
    website: 'https://lastpass.com',
    pricingPlans: {
      US: { premium: 3, family: 4 }
    }
  },
  {
    name: 'Bitwarden',
    displayName: 'Bitwarden Premium',
    searchText: 'Bitwarden 密码管理 Password Manager 安全 开源',
    category: 'security',
    icon: '🔑',
    website: 'https://bitwarden.com',
    pricingPlans: {
      US: { premium: 0.83, family: 3.33 }
    }
  },
  // ==================== 开发工具 Developer ====================
  {
    name: 'GitHub Pro',
    displayName: 'GitHub Pro',
    searchText: 'GitHub Pro 代码托管 Git 开发 Developer',
    category: 'developer',
    icon: '🐙',
    website: 'https://github.com',
    pricingPlans: {
      US: { pro: 4, team: 4 }
    }
  },
  {
    name: 'GitHub Copilot',
    displayName: 'GitHub Copilot',
    searchText: 'GitHub Copilot AI 代码补全 编程 开发 自动补全',
    category: 'developer',
    icon: '🤖',
    website: 'https://github.com/features/copilot',
    pricingPlans: {
      US: { individual: 10, business: 19 }
    }
  },
  {
    name: 'JetBrains',
    displayName: 'JetBrains All Products',
    searchText: 'JetBrains IntelliJ IDEA PyCharm WebStorm IDE 开发',
    category: 'developer',
    icon: '🧠',
    website: 'https://jetbrains.com',
    pricingPlans: {
      US: { all: 24.9, individual: 16.9 }
    }
  },
  {
    name: 'Cursor',
    displayName: 'Cursor Pro',
    searchText: 'Cursor Pro AI IDE 代码 编辑器 开发',
    category: 'developer',
    icon: '⚡',
    website: 'https://cursor.com',
    pricingPlans: {
      US: { pro: 20, business: 40 }
    }
  },
  {
    name: 'Vercel',
    displayName: 'Vercel Pro',
    searchText: 'Vercel Pro 部署 Hosting Next.js 前端',
    category: 'developer',
    icon: '▲',
    website: 'https://vercel.com',
    pricingPlans: {
      US: { pro: 20 }
    }
  },
  {
    name: 'Netlify',
    displayName: 'Netlify Pro',
    searchText: 'Netlify Pro 部署 Hosting JAMstack 前端',
    category: 'developer',
    icon: '🌐',
    website: 'https://netlify.com',
    pricingPlans: {
      US: { pro: 19 }
    }
  },
  {
    name: 'GitLab',
    displayName: 'GitLab Premium',
    searchText: 'GitLab Premium 代码托管 CI/CD DevOps 开发',
    category: 'developer',
    icon: '🦊',
    website: 'https://gitlab.com',
    pricingPlans: {
      US: { premium: 29, ultimate: 99 }
    }
  },
  {
    name: 'Docker Hub',
    displayName: 'Docker Pro',
    searchText: 'Docker Hub Pro 容器 Container 镜像',
    category: 'developer',
    icon: '🐳',
    website: 'https://hub.docker.com',
    pricingPlans: {
      US: { pro: 5, team: 9, business: 24 }
    }
  },
  {
    name: 'Postman',
    displayName: 'Postman Pro',
    searchText: 'Postman Pro API 测试 调试 开发',
    category: 'developer',
    icon: '📮',
    website: 'https://postman.com',
    pricingPlans: {
      US: { basic: 12, professional: 29 }
    }
  },
  {
    name: 'Supabase',
    displayName: 'Supabase Pro',
    searchText: 'Supabase Pro Firebase 替代 PostgreSQL BaaS',
    category: 'developer',
    icon: '⚡',
    website: 'https://supabase.com',
    pricingPlans: {
      US: { pro: 25, team: 599 }
    }
  },
  {
    name: 'Railway',
    displayName: 'Railway',
    searchText: 'Railway 部署 Hosting PaaS 云平台 开发',
    category: 'developer',
    icon: '🚂',
    website: 'https://railway.app',
    pricingPlans: {
      US: { pro: 5, team: 20 }
    }
  },
  {
    name: 'Sentry',
    displayName: 'Sentry Team',
    searchText: 'Sentry 错误监控 Error Tracking 日志 开发',
    category: 'developer',
    icon: '🛡️',
    website: 'https://sentry.io',
    pricingPlans: {
      US: { team: 26, business: 80 }
    }
  },
  // ==================== AI 工具 AI Tools ====================
  {
    name: 'ChatGPT Plus',
    displayName: 'ChatGPT Plus',
    searchText: 'ChatGPT Plus OpenAI GPT AI 人工智能 聊天',
    category: 'ai',
    icon: '🤖',
    website: 'https://chat.openai.com',
    pricingPlans: {
      US: { plus: 20, pro: 200 }
    }
  },
  {
    name: 'Claude Pro',
    displayName: 'Claude Pro',
    searchText: 'Claude Pro Anthropic AI 人工智能 聊天',
    category: 'ai',
    icon: '🧠',
    website: 'https://claude.ai',
    pricingPlans: {
      US: { pro: 20, team: 30 }
    }
  },
  {
    name: 'Midjourney',
    displayName: 'Midjourney',
    searchText: 'Midjourney MJ AI 绘画 图片生成 Art',
    category: 'ai',
    icon: '🎨',
    website: 'https://midjourney.com',
    pricingPlans: {
      US: { basic: 10, standard: 30, pro: 60 }
    }
  },
  {
    name: 'Perplexity',
    displayName: 'Perplexity Pro',
    searchText: 'Perplexity Pro AI 搜索 Search 问答',
    category: 'ai',
    icon: '🔍',
    website: 'https://perplexity.ai',
    pricingPlans: {
      US: { pro: 20 }
    }
  },
  {
    name: 'Gemini Advanced',
    displayName: 'Gemini Advanced',
    searchText: 'Gemini Advanced Google AI 谷歌 聊天',
    category: 'ai',
    icon: '✨',
    website: 'https://gemini.google.com',
    pricingPlans: {
      US: { advanced: 19.99 }
    }
  },
  {
    name: 'Copilot Pro',
    displayName: 'Microsoft Copilot Pro',
    searchText: 'Copilot Pro Microsoft 微软 AI 助手 Office',
    category: 'ai',
    icon: '🤖',
    website: 'https://copilot.microsoft.com',
    pricingPlans: {
      US: { pro: 20 }
    }
  },
  {
    name: 'Poe',
    displayName: 'Poe Subscription',
    searchText: 'Poe Quora AI 多模型 聊天 ChatGPT Claude',
    category: 'ai',
    icon: '💬',
    website: 'https://poe.com',
    pricingPlans: {
      US: { monthly: 19.99, yearly: 199.99 }
    }
  },
  {
    name: 'Runway',
    displayName: 'Runway Standard',
    searchText: 'Runway AI 视频生成 视频编辑 Gen-2',
    category: 'ai',
    icon: '🎥',
    website: 'https://runwayml.com',
    pricingPlans: {
      US: { standard: 12, pro: 28, unlimited: 76 }
    }
  },
  {
    name: 'ElevenLabs',
    displayName: 'ElevenLabs',
    searchText: 'ElevenLabs AI 语音 TTS 文字转语音 配音',
    category: 'ai',
    icon: '🗣️',
    website: 'https://elevenlabs.io',
    pricingPlans: {
      US: { starter: 5, creator: 22, pro: 99 }
    }
  },
  {
    name: 'Kimi Chat',
    displayName: 'Kimi 会员',
    searchText: 'Kimi 月之暗面 Moonshot AI 长文本 聊天',
    category: 'ai',
    icon: '🌙',
    website: 'https://kimi.moonshot.cn',
    pricingPlans: {
      CN: { monthly: 59 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Doubao',
    displayName: '豆包会员',
    searchText: '豆包 Doubao 字节跳动 AI 聊天',
    category: 'ai',
    icon: '🫘',
    website: 'https://doubao.com',
    pricingPlans: {
      CN: { monthly: 19.9 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Tongyi Qianwen',
    displayName: '通义千问会员',
    searchText: '通义千问 Qwen 阿里 AI 聊天',
    category: 'ai',
    icon: '🧠',
    website: 'https://tongyi.aliyun.com',
    pricingPlans: {
      CN: { monthly: 19.9 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== VPN & 安全 Security ====================
  {
    name: 'ExpressVPN',
    displayName: 'ExpressVPN',
    searchText: 'ExpressVPN VPN 翻墙 科学上网 隐私',
    category: 'security',
    icon: '🛡️',
    website: 'https://expressvpn.com',
    pricingPlans: {
      US: { monthly: 12.95, yearly: 8.32 }
    }
  },
  {
    name: 'NordVPN',
    displayName: 'NordVPN',
    searchText: 'NordVPN VPN 翻墙 科学上网 隐私',
    category: 'security',
    icon: '🔒',
    website: 'https://nordvpn.com',
    pricingPlans: {
      US: { monthly: 12.99, yearly: 4.99 }
    }
  },
  {
    name: 'Surfshark',
    displayName: 'Surfshark',
    searchText: 'Surfshark VPN 翻墙 科学上网 隐私',
    category: 'security',
    icon: '🦈',
    website: 'https://surfshark.com',
    pricingPlans: {
      US: { monthly: 12.95, yearly: 2.49 }
    }
  },
  {
    name: 'Mullvad VPN',
    displayName: 'Mullvad VPN',
    searchText: 'Mullvad VPN 隐私 Privacy 匿名 安全',
    category: 'security',
    icon: '🔐',
    website: 'https://mullvad.net',
    pricingPlans: {
      US: { monthly: 5 }
    }
  },
  {
    name: 'Proton VPN',
    displayName: 'Proton VPN Plus',
    searchText: 'Proton VPN ProtonVPN 隐私 加密 安全',
    category: 'security',
    icon: '🛡️',
    website: 'https://protonvpn.com',
    pricingPlans: {
      US: { plus: 9.99, unlimited: 12.99 }
    }
  },
  // ==================== 游戏 Gaming ====================
  {
    name: 'Xbox Game Pass',
    displayName: 'Xbox Game Pass Ultimate',
    searchText: 'Xbox Game Pass 游戏 Gaming 微软 Microsoft',
    category: 'gaming',
    icon: '🎮',
    website: 'https://xbox.com/gamepass',
    pricingPlans: {
      CN: { ultimate: 59 },
      US: { ultimate: 14.99 }
    }
  },
  {
    name: 'PlayStation Plus',
    displayName: 'PlayStation Plus',
    searchText: 'PlayStation Plus PS Plus 游戏 Gaming Sony 索尼',
    category: 'gaming',
    icon: '🎮',
    website: 'https://playstation.com/ps-plus',
    pricingPlans: {
      CN: { essential: 37, extra: 65 },
      US: { essential: 9.99, extra: 14.99 }
    }
  },
  {
    name: 'Nintendo Switch Online',
    displayName: 'Nintendo Switch Online',
    searchText: 'Nintendo Switch Online 游戏 Gaming 任天堂',
    category: 'gaming',
    icon: '🕹️',
    website: 'https://nintendo.com/switch/online-service',
    pricingPlans: {
      CN: { individual: 20 },
      US: { individual: 3.99, family: 7.99 }
    }
  },
  {
    name: 'EA Play',
    displayName: 'EA Play',
    searchText: 'EA Play 游戏 Gaming EA Sports FIFA',
    category: 'gaming',
    icon: '⚽',
    website: 'https://ea.com/ea-play',
    pricingPlans: {
      US: { standard: 4.99, pro: 14.99 }
    }
  },
  {
    name: 'Steam',
    displayName: 'Steam (估算)',
    searchText: 'Steam Valve 游戏 PC Gaming 游戏平台',
    category: 'gaming',
    icon: '🎮',
    website: 'https://store.steampowered.com',
    pricingPlans: {
      US: { estimated_monthly: 15 }
    }
  },
  {
    name: 'Ubisoft+',
    displayName: 'Ubisoft+',
    searchText: 'Ubisoft+ 育碧 游戏 Gaming 刺客信条',
    category: 'gaming',
    icon: '🎯',
    website: 'https://store.ubisoft.com',
    pricingPlans: {
      US: { premium: 17.99 }
    }
  },
  // ==================== 健身 Fitness ====================
  {
    name: 'Apple Fitness+',
    displayName: 'Apple Fitness+',
    searchText: 'Apple Fitness+ 健身 Fitness 运动 锻炼',
    category: 'fitness',
    icon: '🏃',
    website: 'https://apple.com/apple-fitness-plus',
    pricingPlans: {
      CN: { monthly: 10 },
      US: { monthly: 9.99 }
    }
  },
  {
    name: 'Peloton',
    displayName: 'Peloton Digital',
    searchText: 'Peloton 健身 Fitness 运动 单车 跑步',
    category: 'fitness',
    icon: '🚴',
    website: 'https://onepeloton.com',
    pricingPlans: {
      US: { digital: 12.99, guide: 24 }
    }
  },
  {
    name: 'Keep',
    displayName: 'Keep 会员',
    searchText: 'Keep 健身 Fitness 运动 锻炼 会员',
    category: 'fitness',
    icon: '💪',
    website: 'https://keep.com',
    pricingPlans: {
      CN: { monthly: 19, yearly: 178 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Strava',
    displayName: 'Strava Premium',
    searchText: 'Strava 跑步 骑行 运动 社交 GPS',
    category: 'fitness',
    icon: '🏃',
    website: 'https://strava.com',
    pricingPlans: {
      US: { monthly: 11.99, yearly: 79.99 }
    }
  },
  {
    name: 'Headspace',
    displayName: 'Headspace',
    searchText: 'Headspace 冥想 Meditation 正念 睡眠 减压',
    category: 'fitness',
    icon: '🧘',
    website: 'https://headspace.com',
    pricingPlans: {
      US: { monthly: 12.99, yearly: 69.99 }
    }
  },
  {
    name: 'Calm',
    displayName: 'Calm Premium',
    searchText: 'Calm 冥想 Meditation 睡眠 放松 减压',
    category: 'fitness',
    icon: '🌿',
    website: 'https://calm.com',
    pricingPlans: {
      US: { monthly: 14.99, yearly: 69.99 }
    }
  },
  // ==================== 教育 Education ====================
  {
    name: 'Coursera Plus',
    displayName: 'Coursera Plus',
    searchText: 'Coursera Plus 在线课程 MOOC 大学 学习 证书',
    category: 'education',
    icon: '🎓',
    website: 'https://coursera.org',
    pricingPlans: {
      US: { monthly: 59, yearly: 399 }
    }
  },
  {
    name: 'Udemy',
    displayName: 'Udemy Personal Plan',
    searchText: 'Udemy 在线课程 学习 编程 技能',
    category: 'education',
    icon: '📚',
    website: 'https://udemy.com',
    pricingPlans: {
      US: { personal: 16.58 }
    }
  },
  {
    name: 'Skillshare',
    displayName: 'Skillshare Premium',
    searchText: 'Skillshare 创意课程 设计 摄影 插画 学习',
    category: 'education',
    icon: '🎨',
    website: 'https://skillshare.com',
    pricingPlans: {
      US: { premium: 13.99 }
    }
  },
  {
    name: 'Duolingo',
    displayName: 'Duolingo Plus / Super',
    searchText: 'Duolingo Plus Super 多邻国 语言学习 外语 英语',
    category: 'education',
    icon: '🦉',
    website: 'https://duolingo.com',
    pricingPlans: {
      CN: { super: 68 },
      US: { super: 6.99, family: 9.99 }
    }
  },
  {
    name: 'MasterClass',
    displayName: 'MasterClass',
    searchText: 'MasterClass 大师课 名人 课程 学习',
    category: 'education',
    icon: '🏆',
    website: 'https://masterclass.com',
    pricingPlans: {
      US: { individual: 10, duo: 15, family: 20 }
    }
  },
  {
    name: 'LeetCode',
    displayName: 'LeetCode Premium',
    searchText: 'LeetCode Premium 力扣 算法 刷题 面试 编程',
    category: 'education',
    icon: '💻',
    website: 'https://leetcode.com',
    pricingPlans: {
      CN: { monthly: 99, yearly: 888 },
      US: { monthly: 35, yearly: 159 }
    }
  },
  {
    name: 'CSDN',
    displayName: 'CSDN 会员',
    searchText: 'CSDN 会员 VIP 博客 技术社区 编程',
    category: 'education',
    icon: '💻',
    website: 'https://csdn.net',
    pricingPlans: {
      CN: { monthly: 29.9, yearly: 179 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Zhihu Salt',
    displayName: '知乎盐选会员',
    searchText: '知乎 盐选 会员 VIP 问答 社区 知识',
    category: 'education',
    icon: '💡',
    website: 'https://zhihu.com',
    pricingPlans: {
      CN: { monthly: 25, yearly: 198 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Dedao',
    displayName: '得到 VIP',
    searchText: '得到 Dedao 罗辑思维 知识付费 听书 课程',
    category: 'education',
    icon: '📖',
    website: 'https://dedao.cn',
    pricingPlans: {
      CN: { monthly: 36, yearly: 365 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== 新闻 & 阅读 News & Reading ====================
  {
    name: 'The New York Times',
    displayName: 'The New York Times',
    searchText: 'New York Times NYT 纽约时报 新闻 News',
    category: 'news',
    icon: '📰',
    website: 'https://nytimes.com',
    pricingPlans: {
      US: { digital: 4, all: 12.5 }
    }
  },
  {
    name: 'The Economist',
    displayName: 'The Economist',
    searchText: 'The Economist 经济学人 新闻 News 财经',
    category: 'news',
    icon: '📈',
    website: 'https://economist.com',
    pricingPlans: {
      US: { digital: 15.99, print: 22.99 }
    }
  },
  {
    name: 'Medium',
    displayName: 'Medium Membership',
    searchText: 'Medium 博客 阅读 写作 文章',
    category: 'news',
    icon: '📖',
    website: 'https://medium.com',
    pricingPlans: {
      US: { membership: 5 }
    }
  },
  {
    name: 'The Wall Street Journal',
    displayName: 'The Wall Street Journal',
    searchText: 'Wall Street Journal WSJ 华尔街日报 新闻 财经 金融',
    category: 'news',
    icon: '📰',
    website: 'https://wsj.com',
    pricingPlans: {
      US: { digital: 12.99, print: 22.99 }
    }
  },
  {
    name: 'Bloomberg',
    displayName: 'Bloomberg Digital',
    searchText: 'Bloomberg 彭博 财经 新闻 金融 News',
    category: 'news',
    icon: '📊',
    website: 'https://bloomberg.com',
    pricingPlans: {
      US: { digital: 34.99 }
    }
  },
  {
    name: 'Kindle Unlimited',
    displayName: 'Kindle Unlimited',
    searchText: 'Kindle Unlimited Amazon 电子书 阅读 Ebook',
    category: 'reading',
    icon: '📚',
    website: 'https://amazon.com/kindle-unlimited',
    pricingPlans: {
      CN: { monthly: 12 },
      US: { monthly: 11.99 }
    }
  },
  {
    name: 'Audible',
    displayName: 'Audible',
    searchText: 'Audible Amazon 有声书 Audiobook 听书',
    category: 'reading',
    icon: '🎧',
    website: 'https://audible.com',
    pricingPlans: {
      CN: { monthly: 12 },
      US: { plus: 7.95, premium: 14.95 }
    }
  },
  {
    name: 'WeRead',
    displayName: '微信读书 VIP',
    searchText: '微信读书 WeRead 电子书 阅读 小说',
    category: 'reading',
    icon: '📖',
    website: 'https://weread.qq.com',
    pricingPlans: {
      CN: { monthly: 19, yearly: 168 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Qidian',
    displayName: '起点读书 VIP',
    searchText: '起点读书 Qidian 网络小说 阅读 VIP 阅文',
    category: 'reading',
    icon: '📕',
    website: 'https://qidian.com',
    pricingPlans: {
      CN: { monthly: 15, yearly: 148 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Ximalaya',
    displayName: '喜马拉雅 VIP',
    searchText: '喜马拉雅 Ximalaya 有声书 播客 Podcast 音频',
    category: 'reading',
    icon: '🎧',
    website: 'https://ximalaya.com',
    pricingPlans: {
      CN: { monthly: 25, yearly: 218 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== 通讯 & 社交 Communication ====================
  {
    name: 'Zoom',
    displayName: 'Zoom Pro',
    searchText: 'Zoom 视频会议 Meeting 远程办公',
    category: 'communication',
    icon: '📹',
    website: 'https://zoom.us',
    pricingPlans: {
      US: { pro: 15.99, business: 21.99 }
    }
  },
  {
    name: 'Slack',
    displayName: 'Slack Pro',
    searchText: 'Slack 团队协作 聊天 办公 协作',
    category: 'communication',
    icon: '💬',
    website: 'https://slack.com',
    pricingPlans: {
      US: { pro: 8.75, business: 15 }
    }
  },
  {
    name: 'Discord Nitro',
    displayName: 'Discord Nitro',
    searchText: 'Discord Nitro 聊天 游戏 社区',
    category: 'communication',
    icon: '🎮',
    website: 'https://discord.com/nitro',
    pricingPlans: {
      US: { basic: 2.99, full: 9.99 }
    }
  },
  {
    name: 'LinkedIn Premium',
    displayName: 'LinkedIn Premium',
    searchText: 'LinkedIn Premium 领英 职场 社交 招聘',
    category: 'communication',
    icon: '💼',
    website: 'https://linkedin.com/premium',
    pricingPlans: {
      US: { career: 29.99, business: 59.99 }
    }
  },
  {
    name: 'Telegram Premium',
    displayName: 'Telegram Premium',
    searchText: 'Telegram Premium 电报 聊天 通讯 加密',
    category: 'communication',
    icon: '✈️',
    website: 'https://telegram.org',
    pricingPlans: {
      US: { premium: 4.99 }
    }
  },
  {
    name: 'X Premium',
    displayName: 'X Premium (Twitter Blue)',
    searchText: 'X Premium Twitter Blue 推特 社交 蓝标',
    category: 'communication',
    icon: '𝕏',
    website: 'https://x.com',
    pricingPlans: {
      US: { basic: 3, premium: 8, premiumPlus: 16 }
    }
  },
  {
    name: 'Weibo VIP',
    displayName: '微博会员',
    searchText: '微博 Weibo VIP 会员 社交 新浪',
    category: 'communication',
    icon: '📱',
    website: 'https://weibo.com',
    pricingPlans: {
      CN: { monthly: 10.8, yearly: 108 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== 域名 & 托管 Domain & Hosting ====================
  {
    name: 'Cloudflare',
    displayName: 'Cloudflare Pro',
    searchText: 'Cloudflare CDN DNS 安全 性能',
    category: 'hosting',
    icon: '☁️',
    website: 'https://cloudflare.com',
    pricingPlans: {
      US: { pro: 20, business: 200 }
    }
  },
  {
    name: 'Namecheap',
    displayName: 'Namecheap Domain',
    searchText: 'Namecheap 域名 Domain 托管',
    category: 'hosting',
    icon: '🌐',
    website: 'https://namecheap.com',
    pricingPlans: {
      US: { domain: 10 }
    },
    defaultCycle: 'yearly'
  },
  {
    name: 'DigitalOcean',
    displayName: 'DigitalOcean',
    searchText: 'DigitalOcean 云服务器 VPS 托管 Cloud',
    category: 'hosting',
    icon: '🌊',
    website: 'https://digitalocean.com',
    pricingPlans: {
      US: { basic: 4, regular: 12 }
    }
  },
  {
    name: 'AWS',
    displayName: 'Amazon Web Services',
    searchText: 'AWS Amazon Web Services 云计算 Cloud EC2 S3',
    category: 'hosting',
    icon: '☁️',
    website: 'https://aws.amazon.com',
    pricingPlans: {
      US: { estimated_monthly: 50 }
    }
  },
  {
    name: 'Aliyun',
    displayName: '阿里云',
    searchText: '阿里云 Aliyun 云计算 ECS 服务器 云服务',
    category: 'hosting',
    icon: '☁️',
    website: 'https://aliyun.com',
    pricingPlans: {
      CN: { ecs_basic: 46, ecs_standard: 148 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Tencent Cloud',
    displayName: '腾讯云',
    searchText: '腾讯云 Tencent Cloud 云计算 CVM 服务器',
    category: 'hosting',
    icon: '☁️',
    website: 'https://cloud.tencent.com',
    pricingPlans: {
      CN: { lightweight: 38, cvm_basic: 98 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Huawei Cloud',
    displayName: '华为云',
    searchText: '华为云 Huawei Cloud 云计算 服务器 云服务',
    category: 'hosting',
    icon: '☁️',
    website: 'https://huaweicloud.com',
    pricingPlans: {
      CN: { ecs_basic: 49, ecs_standard: 149 }
    },
    defaultCurrency: 'CNY'
  },
  // ==================== 电商 & 购物 Shopping ====================
  {
    name: 'Amazon Prime',
    displayName: 'Amazon Prime',
    searchText: 'Amazon Prime 亚马逊 会员 购物 快递 视频',
    category: 'shopping',
    icon: '📦',
    website: 'https://amazon.com/prime',
    pricingPlans: {
      CN: { yearly: 288 },
      US: { monthly: 14.99, yearly: 139 }
    }
  },
  {
    name: 'JD Plus',
    displayName: '京东 PLUS 会员',
    searchText: '京东 JD PLUS 购物 会员 电商',
    category: 'shopping',
    icon: '🛒',
    website: 'https://plus.jd.com',
    pricingPlans: {
      CN: { yearly: 148 }
    },
    defaultCurrency: 'CNY',
    defaultCycle: 'yearly'
  },
  {
    name: 'Taobao 88VIP',
    displayName: '淘宝 88VIP',
    searchText: '淘宝 88VIP 天猫 阿里 购物 会员 电商',
    category: 'shopping',
    icon: '🛍️',
    website: 'https://www.taobao.com',
    pricingPlans: {
      CN: { yearly: 88 }
    },
    defaultCurrency: 'CNY',
    defaultCycle: 'yearly'
  },
  {
    name: 'Costco',
    displayName: 'Costco Membership',
    searchText: 'Costco 开市客 会员制 超市 批发 购物',
    category: 'shopping',
    icon: '🏪',
    website: 'https://costco.com',
    pricingPlans: {
      CN: { gold_star: 299 },
      US: { gold_star: 65, executive: 130 }
    },
    defaultCycle: 'yearly'
  },
  {
    name: 'Sam Club',
    displayName: '山姆会员商店',
    searchText: '山姆 Sam Club 沃尔玛 会员制 超市 购物',
    category: 'shopping',
    icon: '🏬',
    website: 'https://samsclub.com',
    pricingPlans: {
      CN: { basic: 260, excellence: 680 },
      US: { club: 50, plus: 110 }
    },
    defaultCycle: 'yearly'
  },
  {
    name: 'Meituan',
    displayName: '美团会员/神会员',
    searchText: '美团 Meituan 外卖 会员 神会员 团购',
    category: 'shopping',
    icon: '🍔',
    website: 'https://meituan.com',
    pricingPlans: {
      CN: { monthly: 15 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'Ele.me',
    displayName: '饿了么超级吃货卡',
    searchText: '饿了么 Ele.me 外卖 超级吃货卡 会员',
    category: 'shopping',
    icon: '🍜',
    website: 'https://ele.me',
    pricingPlans: {
      CN: { monthly: 15 }
    },
    defaultCurrency: 'CNY'
  },
  {
    name: 'PDD',
    displayName: '拼多多省钱月卡',
    searchText: '拼多多 PDD 省钱月卡 购物 电商',
    category: 'shopping',
    icon: '🛒',
    website: 'https://pinduoduo.com',
    pricingPlans: {
      CN: { monthly: 5.9 }
    },
    defaultCurrency: 'CNY'
  },
];

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Subscription Templates Seed - 导入订阅服务模板              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - 仅显示将要执行的操作\n');
  }

  console.log(`📦 模板数量: ${templates.length}\n`);

  // Clean mode: clear existing data
  if (cleanMode) {
    console.log('🧹 Clean Mode: 清空现有数据...\n');
    
    if (!dryRun) {
      await prisma.subscriptionTemplate.deleteMany({});
      console.log('   ✓ 已清空 subscription_templates');
    } else {
      console.log('   [DRY RUN] 将清空 subscription_templates');
    }
    console.log();
  }

  // Process templates
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const template of templates) {
    const { name, displayName, searchText, category, icon, website, pricingPlans, defaultCurrency, defaultCycle } = template;

    if (dryRun) {
      console.log(`   [DRY RUN] 将 upsert: ${name}`);
      continue;
    }

    try {
      // Check if exists
      const existing = await prisma.subscriptionTemplate.findUnique({
        where: { name }
      });

      if (existing) {
        // Update
        await prisma.subscriptionTemplate.update({
          where: { name },
          data: {
            displayName,
            searchText,
            category,
            icon,
            website,
            pricingPlans,
            defaultCurrency: defaultCurrency ?? 'CNY',
            defaultCycle: defaultCycle ?? 'monthly',
          }
        });
        updated++;
        console.log(`   ✓ 已更新: ${name}`);
      } else {
        // Create
        await prisma.subscriptionTemplate.create({
          data: {
            name,
            displayName,
            searchText,
            category,
            icon,
            website,
            pricingPlans,
            defaultCurrency: defaultCurrency ?? 'CNY',
            defaultCycle: defaultCycle ?? 'monthly',
          }
        });
        created++;
        console.log(`   ✓ 已创建: ${name}`);
      }
    } catch (error: any) {
      console.error(`   ✗ 失败: ${name} - ${error.message}`);
      skipped++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 执行摘要:');
  console.log(`   新增: ${created}`);
  console.log(`   更新: ${updated}`);
  console.log(`   跳过: ${skipped}`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN 完成 - 未修改任何数据');
  } else {
    console.log('\n✅ 同步完成!');
  }
}

main()
  .catch((error) => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
