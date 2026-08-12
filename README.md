# 古诗词学习系统

融合趣味游戏与个性化学习的古诗词教育平台。

## 项目简介

前后端分离的古诗词在线学习系统，分为**学生端**和**教师端**，支持多种趣味闯关模式、AI 智能辅导和个性化学习路径。

### 主要特色

- 多种趣味闯关模式：飞花令对战、诗词接龙、诗词跑酷、诗词消消乐
- AI 智能辅导：基于大语言模型的诗词解读、背诵检测、字符详解和学习建议
- 个性化学习分析：智能分析学习数据，提供个性化诗词推荐
- 教师管理后台：学生管理、班级管理、学习数据统计与分析
- 实时对战：支持多人在线飞花令对战
- 意境图生成：AI 生成诗词意境图和诗人头像

## 技术栈

### 前端
- Vue 3 + Composition API
- Vite
- Pinia
- Axios
- ECharts

### 后端
- Node.js + Express
- **PostgreSQL** (pg)
- JWT
- Socket.io
- 硅基流动 API / 阿里云百炼 API

## 环境配置

### 前置要求

- Node.js >= 18
- PostgreSQL >= 14

### 1. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置 PostgreSQL

确保 PostgreSQL 服务已运行，并创建数据库：

```sql
CREATE DATABASE poetry_db;
```

### 3. 环境变量

复制 `backend/.env.example` 为 `backend/.env` 并填写：

```env
# 数据库连接（必填）
DATABASE_URL=postgresql://user:password@localhost:5432/poetry_db

# AI API 配置（至少配置一个）
SILICONFLOW_API_KEY=your-siliconflow-api-key
# ALIYUN_BAILIAN_API_KEY=your-aliyun-bailian-api-key

# 服务器配置
PORT=3000

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

### 4. 数据库迁移与种子数据

```bash
cd backend

# 建表
npm run db:migrate

# 填充初始数据（默认诗词 + 模拟用户）
npm run db:seed
```

### 5. 启动服务

```bash
# 后端
cd backend && npm start

# 前端开发服务器
cd frontend && npm run dev
```

## 项目结构

```
backend/
├── scripts/
│   ├── migrate.js              # 数据库建表脚本
│   └── seed.js                 # 初始数据填充脚本
├── src/
│   ├── api/                    # 路由层
│   ├── config/                 # 配置
│   ├── middleware/
│   │   ├── auth.js             # JWT 认证
│   │   └── errorHandler.js     # 集中式错误处理
│   ├── services/               # 业务逻辑
│   ├── socket/                 # WebSocket
│   ├── utils/
│   │   ├── db.js               # PostgreSQL 连接池
│   │   └── socket.js           # Socket.io 单例
│   └── socket.js               # WebSocket 事件处理
├── server.js                   # 入口
└── package.json
```

## 功能模块

### 学生端

| 功能 | 路由 |
|------|------|
| 诗词列表与搜索 | `/search` |
| 诗词详情（AI 讲解、背诵检测） | `/poem/:id` |
| 飞花令单人/对战 | `/feihua/single`, `/feihua/multiplayer` |
| 诗词跑酷 | `/poetry-parkour` |
| 诗词消消乐 | `/poetry-card-catch` |
| 诗词闯关 | `/poem-challenge` |
| 诗词接龙对战 | `/challenge-battle` |
| 错题本 | `/error-book` |
| 学习看板 | `/dashboard` |

### 教师端

| 功能 | 路由 |
|------|------|
| 数据看板 | `/teacher/dashboard` |
| 学生管理 | `/teacher/students` |
| 班级管理 | `/teacher/classes` |
| 诗词管理 | `/teacher/poems` |
| 游戏数据 | `/teacher/game-data` |

## API 接口概览

### 认证
- `POST /api/auth/register` - 学生注册
- `POST /api/auth/login` - 学生登录
- `GET  /api/auth/verify` - 验证令牌

### 诗词
- `GET /api/poems` - 诗词列表（分页、筛选）
- `GET /api/poems/:id` - 诗词详情
- `GET /api/daily-poem` - 每日推荐

### AI
- `POST /api/ai/explainPoem` - 诗词讲解
- `POST /api/ai/recite-check` - 背诵检测
- `POST /api/ai/tutor` - AI 对话助教
- `POST /api/ai/scene-image` - 意境图生成

### 游戏
- `POST /api/feihua/start` - 开始飞花令
- `GET  /api/feihua/ranking` - 排行榜
- `POST /api/card-game/verify` - 卡牌游戏验证

### 教师
- `GET /api/teacher/dashboard` - 看板
- `GET /api/teacher/students` - 学生列表
- `GET /api/teacher/classes` - 班级列表

## 数据库

系统使用 PostgreSQL，共 30 张表。建表和种子数据通过独立脚本管理：

```bash
npm run db:migrate    # 创建所有表和索引
npm run db:seed       # 填充默认诗词和模拟数据
```

### 核心表

| 表名 | 说明 |
|------|------|
| users | 学生用户 |
| teachers | 教师用户 |
| poems | 诗词数据 |
| learning_records | 学习记录 |
| collections | 收藏 |
| feihua_battles | 飞花令对战记录 |
| challenge_battles | 闯关对战记录 |
| wrong_questions | 错题本 |

## 实时通信

系统使用 Socket.io 实现飞花令对战匹配、闯关对战和图像生成进度推送。

## 常见问题

### 数据库连接失败
- 检查 PostgreSQL 服务是否运行
- 确认 `DATABASE_URL` 格式正确：`postgresql://user:password@host:port/dbname`
- 确保数据库已创建且用户有访问权限

### AI 功能不可用
- 检查 `SILICONFLOW_API_KEY` 或 `ALIYUN_BAILIAN_API_KEY` 是否配置
- API 不可用时会返回降级数据

### WebSocket 连接失败
- 确认后端服务正常运行
- 检查代理配置是否支持 WebSocket

## 许可证

MIT License
