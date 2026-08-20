# 数据库说明

## 双数据库架构

| 模式 | DB_TYPE | 说明 |
|---|---|---|
| 生产 | `postgres` | 仅使用 PostgreSQL，连接失败直接报错 |
| 开发 | `sqlite` | 仅使用 SQLite，不尝试 PostgreSQL |
| 自动 | `auto` (默认) | 优先 PostgreSQL，连接失败进程级降级到 SQLite |

**重要**：`auto` 模式下降级是进程级的，启动后不会来回切换。

## 环境变量

```bash
DB_TYPE=auto                    # auto | postgres | sqlite
DATABASE_URL=postgresql://...   # PG 连接串
DB_PATH=./db/poetry.db          # SQLite 文件路径
```

## 核心表

| 表 | 说明 |
|---|---|
| users | 学生用户 |
| teachers | 教师用户 |
| poems | 诗词库 |
| learning_records | 学习记录 |
| learning_events | 学习事件（幂等，event_key UNIQUE） |
| wrong_questions | 错题本 |
| card_game_records | 卡牌游戏记录 |
| card_game_errors | 卡牌游戏错误详情 |
| user_challenge_records | 闯关记录 |
| feihua_battles | 飞花令对战 |
| student_knowledge_states | 学生知识状态（掌握度） |
| knowledge_points | 知识点定义 |
| question_knowledge_mappings | 题目-知识点映射 |
| class_stats | 班级统计 |
| teacher_classes | 教师-班级多对多映射（授权核心） |
| teacher_notes | 教师对学生备注 |
| student_tags | 学生标签 |
| review_sessions | 复习会话 |
| review_session_items | 复习会话题目 |

## 事务支持

```js
await db.transaction(async (tx) => {
  // tx.query / tx.all / tx.get / tx.run
  // 自动 BEGIN / COMMIT / ROLLBACK
});
```

## 索引优化

高频查询已建立索引：`wrong_questions(user_id)`、`card_game_records(user_id, created_at)`、`learning_records(user_id, poem_id)`、`student_knowledge_states(user_id, knowledge_point_id)`、`learning_events(user_id, created_at)`、`teacher_classes(teacher_id, class_id)` 等。

## Migration

- SQLite: `sqliteMigration.js` 在启动时自动执行（幂等）
- PostgreSQL: 依赖外部 schema 初始化
- 迁移测试使用临时数据库副本，不修改真实 `poetry.db`

## 方言兼容

db.js 提供方言辅助函数：
- `db.dateOnly(col)` — 日期提取
- `db.dateDaysAgo(n)` — N天前
- `db.greatest(a, b)` — MAX / CASE
- `db.nowText()` — 当前时间
- `db.serialPrimaryKey()` — 自增主键

## 测试数据库策略

- **禁止**使用真实 `backend/db/poetry.db` 做破坏性测试
- 测试应复制 `poetry.db` 到临时文件或使用 `:memory:`
- `NODE_ENV=test` 时应使用临时数据库