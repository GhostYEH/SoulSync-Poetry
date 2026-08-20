# SoulSync-Poetry

> 基于学习行为认知诊断与可信知识检索的个性化古诗词学习智能体

## 核心学习闭环

```
学习行为（答题 / 背诵 / 飞花令 / 闯关）
        │
        ▼
  LearningEvent                       ← 幂等写入（attemptId / gameSessionId）
        │
        ▼
  StudentKnowledgeState               ← 加权贝叶斯证据更新（mastery / confidence）
        │
        ▼
  CognitiveDiagnosis                  ← 高置信薄弱 / 低证据 / 发展中 分类
        │
        ▼
  Poetry Knowledge Retrieval          ← 结构化 + 关键词检索（非向量数据库）
        │
        ▼
  Personalized AI Tutoring            ← Grounded LLM，事实来自 DB，AI 只做讲解
        │
        ▼
  Targeted Practice                   ← 从已有题库（question_knowledge_mappings）推荐
        │
        ▼
  LearningEvent → State Update        ← 闭环回归
```

这不是一个单纯的小游戏网站。游戏（飞花令 / 接龙 / 跑酷 / 消消乐）是**学习行为来源**，为认知诊断提供真实证据，驱动个性化教学。

## 核心创新（按优先级）

| # | 模块 | 说明 |
|---|------|------|
| 1 | **Learning Intelligence Core** | LearningEvent 幂等写入 → StudentKnowledgeState 加权贝叶斯证据更新 |
| 2 | **Student Knowledge State** | 每用户×知识点的 mastery / confidence / attemptCount / recentPerformance |
| 3 | **Cognitive Diagnosis** | 高置信薄弱 / 低证据 / 发展中 / 掌握良好 四级分类 + 错误模式分析 |
| 4 | **Trusted Poetry Retrieval** | 结构化检索 + 关键词检索，sources 严格来自 DB，LLM 不可自造引用 |
| 5 | **Personalized AI Tutor** | 按掌握度三档（FOUNDATION / DEVELOPING / ADVANCED）调整教学深度 |
| 6 | **Adaptive Practice** | 从已有题库通过 question_knowledge_mappings 推荐，非 AI 编题 |
| 7 | **Multimodal Recitation** | 语音背诵检测 + AI 评分，attemptId 幂等 |
| 8 | **Interactive Games** | 飞花令 / 接龙 / 跑酷 / 消消乐 — 学习行为来源，非独立娱乐 |
| 9 | **Teacher Analytics** | 班级知识热力图 / 高频薄弱点 / 学生画像，Source of Truth: student_knowledge_states |

## 技术栈

### 前端
- Vue 3 + Composition API
- Vite 6
- Pinia
- ECharts
- Socket.io-client

### 后端
- Node.js + Express
- **PostgreSQL** (pg 连接池)
- JWT（authenticateToken 强认证 / optionalAuthenticateToken 宽松认证）
- Socket.io
- 硅基流动 API（Qwen2.5-7B-Instruct，对话 / 出题）/ 阿里云百炼 API（文生图）

### AI Provider
- **SiliconFlow** — 对话 / 出题 / 个性化教学（Qwen/Qwen2.5-7B-Instruct）
- **阿里云百炼** — 诗词意境图生成 / 诗人头像
- AI 不可用时降级返回数据库事实 + degraded = true

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

```sql
CREATE DATABASE poetry_db;
```

### 3. 环境变量

复制 `backend/.env.example` 为 `backend/.env` 并填写：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/poetry_db
SILICONFLOW_API_KEY=your-siliconflow-api-key
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
```

### 4. 数据库迁移与种子

```bash
cd backend
npm run db:migrate   # 创建 37 张表 + 索引
npm run db:seed      # 基础诗词 + 基础题目 + 开发测试账号
```

### 5. 启动

```bash
cd backend && npm start
cd frontend && npm run dev
```

## API 接口

### 认证
| 接口 | 认证 | 说明 |
|------|------|------|
| `POST /api/auth/register` | 无 | 学生注册 |
| `POST /api/auth/login` | 无 | 学生登录 |
| `GET  /api/auth/verify` | Token | 验证令牌 |

### 学习智能（核心闭环）
| 接口 | 认证 | 说明 |
|------|------|------|
| `GET  /api/learning-intelligence/student/states` | **authenticateToken** | 学生知识状态 |
| `GET  /api/learning-intelligence/student/diagnosis` | **authenticateToken** | 认知诊断 |
| `GET  /api/learning-intelligence/student/recommendation` | **authenticateToken** | 自适应推荐 |
| `GET  /api/learning-intelligence/student/events` | **authenticateToken** | 学习事件查询 |
| `GET  /api/learning-path/ability` | **authenticateToken** | 能力模型（4 维聚合） |

### AI
| 接口 | 认证 | 说明 |
|------|------|------|
| `POST /api/ai/personalized-tutor` | **authenticateToken** | 个性化教学（RAG 驱动） |
| `POST /api/ai/explainPoem/:type` | 无 | 诗词讲解（公共，4 种类型） |
| `POST /api/ai/tutor` | 无 | AI 对话助教（公共） |
| `POST /api/ai/recite-check` | optional | 背诵检测（匿名可用，登录才记录学习事件） |
| `POST /api/ai/image/pregenerate` | 无 | 意境图预生成 |

#### Personalized Tutor 详细说明

`POST /api/ai/personalized-tutor` — **必须登录**，无 token / 无效 token / 过期 token 均返回 401。

- 读取真实登录用户的 `StudentKnowledgeState`
- 使用 `CognitiveDiagnosis` 确定高置信薄弱知识点
- `PoetryKnowledgeRetriever` 检索可信诗词事实（作者 / 朝代 / 原文来自 poems 表）
- 按掌握度三档（FOUNDATION < 40% / DEVELOPING 40-70% / ADVANCED > 70%）调整教学深度
- 从已有题库（question_knowledge_mappings）推荐练习，非 AI 编题
- AI 失败时降级返回数据库事实 + `degraded: true`
- `sources` 严格来自 Retriever，LLM 返回 JSON 中即使自造 citation 也不覆盖正式 sources

### 诗词（公共）
| 接口 | 认证 | 说明 |
|------|------|------|
| `GET /api/poems` | 无 | 诗词列表（分页 / 筛选） |
| `GET /api/poems/:id` | 无 | 诗词详情 |
| `GET /api/daily-poem` | 无 | 每日推荐 |

### 互动学习形式
| 接口 | 说明 |
|------|------|
| `POST /api/feihua/start` | 飞花令（gameSessionId 幂等） |
| `GET  /api/feihua/ranking` | 飞花令排行榜 |
| `POST /api/card-game/save` | 消消乐记录 |
| `POST /api/challenge/answer` | 闯关答题（clientAttemptId 幂等） |

### 教师
| 接口 | 认证 | 说明 |
|------|------|------|
| `GET /api/teacher/dashboard` | authenticateTeacher | 数据看板 |
| `GET /api/teacher/knowledge/overview` | authenticateTeacher | 班级知识概览 |
| `GET /api/teacher/knowledge/heatmap` | authenticateTeacher | 知识掌握热力图 |
| `GET /api/teacher/knowledge/weak-points` | authenticateTeacher | 高频薄弱知识点 |
| `GET /api/teacher/knowledge/student/:id/profile` | authenticateTeacher | 学生知识画像 |

## 数据库

PostgreSQL，共 **37 张表**。

### 学习智能核心表
| 表名 | 说明 |
|------|------|
| `knowledge_points` | 知识点树（一级维度 + 二级知识点，code / category / parent_id） |
| `question_knowledge_mappings` | 题目 ↔ 知识点关联（weight / source: manual / rule） |
| `learning_events` | 学习事件（eventKey 幂等，eventType / correct / score / metadata） |
| `student_knowledge_states` | 学生知识状态（mastery / confidence / attemptCount / recentPerformance） |

### 基础数据表
| 表名 | 说明 |
|------|------|
| `users` / `teachers` / `classes` | 用户 / 教师 / 班级 |
| `poems` | 诗词（title / author / dynasty / content / tags） |
| `poetry_challenges` | 题库 |
| `learning_records` / `collections` / `wrong_questions` | 学习记录 / 收藏 / 错题 |

## 能力边界（如实声明）

### 知识映射
- 知识点 ↔ 诗词关键词映射目前为**手动 / 规则**来源（`KNOWLEDGE_KEYWORD_MAP`）
- 意象类知识点（月 / 柳 / 雁 / 酒 等）有明确关键词映射
- 部分知识点（memorization / author_dynasty 等）无关键词映射，此时 `findPoemsForKnowledgePoint` 返回空数组，**不使用随机诗词冒充知识点相关来源**

### RAG 架构
- 当前是 **Structured Retrieval + Keyword Retrieval + Grounded Generation**
- **不是向量数据库**，不是 embedding 相似度检索
- 优点：可解释、低基础设施依赖、事实来源明确
- 事实性数据（作者 / 朝代 / 原文）严格来自 poems 表，LLM 只负责生成讲解和分析

### 掌握度算法
- **加权贝叶斯证据模型**（Beta-Binomial 后验 + 时间衰减 + 非负证据分离）
- mastery 与 confidence 严格分离：mastery 是掌握程度，confidence 是样本量 + 一致性
- 三档教学深度：FOUNDATION (< 40%) / DEVELOPING (40-70%) / ADVANCED (> 70%)

### 幂等设计
- Answer: `clientAttemptId`（前端生成 UUID，HTTP 重试复用）
- Recitation: `attemptId`
- Feihualing: `gameSessionId`
- 相同 ID → 相同 eventKey → LearningEvent 不重复
- 不同 ID → 不同 eventKey → 允许重练

## 项目结构

```
backend/
├── scripts/
│   ├── migrate.js              # 37 张表建表脚本
│   └── seed.js                 # 基础诗词 + 题目 + 开发账号
├── src/
│   ├── api/                    # 23 个路由文件
│   │   ├── aiRoutes.js         # AI 接口（personalized-tutor / explainPoem / recite-check）
│   │   ├── learningIntelligenceRoutes.js  # 学习智能（强认证）
│   │   └── teacherRoutes.js    # 教师端（authenticateTeacher）
│   ├── middleware/auth.js      # authenticateToken + optionalAuthenticateToken
│   ├── services/               # 业务逻辑
│   │   ├── personalizedTutorService.js   # RAG Generation + 编排
│   │   ├── poetryKnowledgeRetriever.js   # RAG Retrieval
│   │   ├── cognitiveDiagnosisService.js  # 认知诊断
│   │   ├── masteryUpdateEngine.js        # 加权贝叶斯证据更新
│   │   ├── learningEventService.js       # LearningEvent 幂等写入
│   │   └── abilityModelService.js        # 4 维能力聚合
│   └── utils/db.js             # PostgreSQL 连接池
└── tests/                      # 8 个测试文件
    ├── auth.test.js            # 认证中间件
    ├── personalizedTutorAuth.test.js  # personalized-tutor 串用户防护
    ├── learningCore.test.js    # 掌握度算法 50 项
    ├── idempotency.test.js     # 幂等性 23 项
    ├── abilityAggregation.test.js     # 能力聚合 26 项
    ├── ragTutor.test.js        # RAG 纯函数
    ├── integration.test.js     # PostgreSQL 集成（需 DB）
    └── api.test.js             # API 集成（需 DB）
```

## 测试

```bash
cd backend

# 单元测试（无需 PostgreSQL）
node tests/auth.test.js                    # 认证中间件
node tests/personalizedTutorAuth.test.js   # personalized-tutor 串用户防护
node tests/learningCore.test.js            # 掌握度算法
node tests/idempotency.test.js             # 幂等性
node tests/abilityAggregation.test.js      # 能力聚合
node tests/ragTutor.test.js                # RAG 纯函数

# 集成测试（需要 PostgreSQL + DATABASE_URL）
node tests/integration.test.js
node tests/api.test.js
```

### 安全测试

```bash
cd backend
npm run test:security   # IDOR + 防作弊 + JWT验证（15/15）
```

## 安全加固

| 措施 | 说明 |
|------|------|
| 教师授权 | `teacher_classes` 多对多映射 + `assertTeacherCanAccessStudent` 校验所有学生数据访问 |
| 防作弊 | 服务端 `checkAnswer` 判定，不信任客户端 `isCorrect` |
| Helmet | CSP、安全响应头 |
| Rate Limit | 登录/注册/AI接口限流 |
| JWT加固 | 生产环境弱密钥拒绝启动 |
| 事务 | `db.transaction()` 保证多写原子性 |
| 统一错误 | `{ success: false, error: { code, message } }` |

## 常见问题

### 数据库连接失败
- 检查 PostgreSQL 服务是否运行
- 确认 `DATABASE_URL` 格式正确
- 确保数据库已创建且用户有访问权限

### AI 功能不可用
- 检查 `SILICONFLOW_API_KEY` 是否配置
- AI 不可用时个性化教学降级返回数据库事实 + `degraded: true`

### 个性化教学返回 401
- `personalized-tutor` 需要登录，未登录请使用公共 AI 接口（`explainPoem` / `tutor`）

## 许可证

MIT License
