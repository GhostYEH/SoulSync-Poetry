# SoulSync-Poetry 架构说明

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + TypeScript |
| 后端 | Node.js (>=22.5) + Express + Socket.IO |
| 数据库 | PostgreSQL (生产) / SQLite (开发兼容) |
| 认证 | JWT (jsonwebtoken) + bcrypt |
| AI | SiliconFlow / 阿里云百炼 (OpenAI 兼容接口) |

## 目录结构

```
gushici/
├── backend/
│   ├── server.js              # 入口：Express + Socket.IO + 路由注册
│   ├── src/
│   │   ├── api/               # 路由层（REST API）
│   │   ├── middleware/        # 认证、错误处理中间件
│   │   ├── services/          # 业务逻辑层
│   │   ├── config/            # 配置集中管理
│   │   ├── utils/             # db.js 适配器、数据加载等
│   │   └── socket/            # WebSocket 处理
│   ├── db/poetry.db           # SQLite 数据文件（开发用）
│   └── tests/                 # 测试脚本
├── frontend/
│   └── src/
│       ├── views/             # Vue 页面组件
│       ├── services/          # API 客户端、AI 创作等
│       └── router/            # 路由配置 + 守卫
└── docs/                      # 项目文档
```

## 认证流程

```
学生注册/登录 → JWT { userId, username, role: 'student' }
教师登录     → JWT { id, username, role: 'teacher' }
请求         → Authorization: Bearer <token>
               → middleware/auth.js 验证 → req.user
               → teacherAuthorizationService 验证教师-学生关系
```

### 教师授权模型

```
teacher_classes (teacher_id, class_id) — 多对多映射
  ↓
teacherAuthz.getTeacherClassIds(teacherId) → [classId, ...]
teacherAuthz.canTeacherAccessStudent(teacherId, studentId) → boolean
teacherAuthz.assertTeacherCanAccessStudent(teacherId, studentId) → throws 403
```

所有教师端点访问学生数据前必须经过 `assertTeacherCanAccessStudent` 校验。

## 学习智能链路

```
用户学习行为
  → learningEventService.recordEvent()
  → INSERT learning_events (ON CONFLICT event_key DO NOTHING)
  → knowledgeModel.inferKnowledgePoints() 推断知识点
  → masteryUpdateEngine.updateFromEvent() 更新掌握度
  → student_knowledge_states (Beta-Binomial 后验)
  → cognitiveDiagnosisService 诊断
  → learningPathService 自适应推荐
```

## 数据库适配

```
db.js
  ├── DB_TYPE=auto    → 优先 PG，失败降级 SQLite
  ├── DB_TYPE=postgres → 仅 PG
  └── DB_TYPE=sqlite   → 仅 SQLite
```

核心方法：`db.query / db.all / db.get / db.run / db.close / db.transaction`
方言辅助：`db.dateOnly / db.dateDaysAgo / db.greatest / db.nowText / db.serialPrimaryKey`

### 事务支持

```js
await db.transaction(async (tx) => {
  const result = await tx.run('INSERT ... RETURNING id', [...]);
  await tx.run('UPDATE ...', [...]);
  // 任一抛异常 → 自动 ROLLBACK；正常返回 → COMMIT
});
```

已覆盖的关键事务：`masteryUpdateEngine.rebuildStudentKnowledgeState`、`updateFromEvent`、`feihuaRankingService.updateRankingAfterBattle`、`reviewService.createReviewSession`、`poetryChallengeService.startChallenge`、`teacherAnalyticsService.createClass`

## 安全中间件

| 中间件 | 说明 |
|---|---|
| Helmet | CSP、XSS防护、安全响应头 |
| express-rate-limit | authLimiter（登录/注册）、aiLimiter（AI接口）、passwordLimiter |
| requestId | 每请求分配唯一ID，慢请求检测 |
| errorHandler | 统一错误格式 `{ success: false, error: { code, message } }` |

## 统一 API 响应

```
成功: { success: true, data: ... }
错误: { success: false, error: { code, message }, message: '...' }
```

工具：`apiResponse.js`（ApiError类 + success/fail函数）、`asyncHandler.js`（自动捕获async异常）、`validation.js`（输入验证 + 分页）

### 已接入 asyncHandler + validate + ApiError 的路由

| 路由 | 端点数 | validate 规则 |
|---|---|---|
| authRoutes | 3 | register/login/verify |
| challengeRoutes | 8 | level/question/userAnswer |
| cardGameRoutes | 10 | score(0-100000)/recordId/questionText |
| wrongQuestionRoutes | 7 | question/answer/questionId |
| feihuaRoutes | 4 | keyword/score/poemCount/history |
| feihuaRankingRoutes | 5 | userId 参数校验 |
| poetryChallengeRoutes | 5 | theme/challengeId/score(1-10) |
| learningPathRoutes | 7 | parsePagination |

### 防作弊机制

| 游戏 | 机制 |
|---|---|
| 闯关 challenge | 服务端查找题目+判定对错，忽略客户端 isCorrect |
| 卡牌 card-game | score 范围验证 0-100000 |
| 飞花令 feihua | 必填字段验证 |
| 诗词挑战 poetry-challenge | 评分范围 1-10 |

### N+1 查询优化

已修复的批量写入：
- `cardGameRoutes` 游戏错误记录 → 单次多值 INSERT
- `learningEventService.persistRuleMappings` 知识点映射 → 单次多值 INSERT + ON CONFLICT

已知待优化（低优先级）：
- `masteryUpdateEngine.updateFromEvent` 循环内 SELECT+UPDATE（热路径，需谨慎重构）
- `abilityModelService.getAbilityRanking` 循环内聚合查询
- `learningPathService` 自适应推荐/今日复习循环内查询

## API 路由前缀

| 前缀 | 模块 | 说明 |
|---|---|---|
| /api | poemRoutes | 诗词列表/详情 |
| /api/auth | authRoutes | 学生认证 |
| /api/teacher | teacherRoutes | 教师后台（含子模块 teacher/poems、teacher/knowledge） |
| /api/card-game | cardGameRoutes | 卡牌游戏 |
| /api/wrong-questions | wrongQuestionRoutes | 错题本 |
| /api/home | homeRoutes | 首页/排行榜 |
| /api/li | learningIntelligenceRoutes | 学习智能 |
| /api/challenge | challengeRoutes | 闯关 |
| /api/feihua | feihuaRoutes | 飞花令 |
| /api/health | (inline) | 健康检查 |