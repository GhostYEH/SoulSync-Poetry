# 测试说明

## 运行测试

```bash
cd backend

# 全部测试（SQLite 模式）
npm run test:all

# 单项测试
npm run test:smoke       # API Smoke Test
npm run test:sqlite      # SQLite 兼容性
npm run test:security    # IDOR + 防作弊
npm run test:transaction # 事务 + 迁移
npm run test:cheat       # 防作弊 + 输入验证
```

## 测试覆盖范围

### apiSmokeTest.js — 14/14
- 学生登录 / JWT verify
- 教师登录
- 诗词列表
- 卡牌游戏保存 / 历史
- 错题本列表
- 首页排行榜

### sqliteCompatibility.test.js — 33/33
- db.get / db.all / db.run 基本操作
- 方言辅助函数
- INSERT RETURNING
- UPDATE / DELETE rowCount
- ON CONFLICT DO NOTHING（LearningEvent 幂等）
- 认证流程（bcrypt + JWT）
- 错题本操作
- LIMIT / OFFSET

### securityTest.js — 15/15
- 教师IDOR防护（教师只能访问所辖班级学生）
- 学生token访问教师端点 → 403
- 无效/伪造JWT → 401
- 防作弊：错误答案+isCorrect=true → 服务端判定false
- 防作弊：正确答案+isCorrect=false → 服务端判定true
- 健康检查

### transactionTest.js — 8/8
- transaction COMMIT
- transaction ROLLBACK
- 迁移幂等性（连续运行3次）
- 空数据库迁移
- teacher_classes 表 + 9 索引创建

### antiCheatTest.js — 17/17
- 答题防作弊：服务端忽略客户端 isCorrect
- 卡牌游戏 score 边界验证（0-100000）
- 飞花令必填字段验证
- 诗词挑战评分边界验证（1-10）
- 错题本必填字段验证
- 答题必填字段验证

## 总计：87/87 全部通过

## 测试规则

1. **禁止**使用真实 `poetry.db` 做破坏性测试
2. 测试创建的临时数据库必须在测试结束后删除
3. 测试失败时退出码必须为非 0（`process.exit(1)`）
4. 不依赖固定 ID（如 `user.id=356`），应动态查询
5. 不依赖外部 PostgreSQL / AI Key 的测试才能纳入基础测试

## 需要外部依赖的测试

| 依赖 | 说明 |
|---|---|
| PostgreSQL | DB_TYPE=postgres 模式下的集成测试 |
| AI API Key | AI 相关功能测试（讲解、创作、诊断） |

缺少这些依赖时，相关测试应标记为 `skipped` 而非 `failed`。

## 依赖安全审计

```bash
cd backend
npm audit
```

已知残留漏洞：
- `uuid@9` (moderate) — 仅使用 v4 无 buffer 参数，实际不受影响
- `xlsx` (high) — SheetJS 社区版无修复，建议替换为官方版

## 前端构建

```bash
cd frontend
npm run build
```

构建输出到 `backend/public/`，供后端静态服务。
