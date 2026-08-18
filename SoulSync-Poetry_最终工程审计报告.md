# SoulSync-Poetry 最终工程审计报告

## A. 总结
- **P0 数量**: 2（已修复）
- **P1 数量**: 5（已修复）
- **P2 数量**: 3（已记录）
- **实际修复数量**: 7

**最终状态**: **CONDITIONALLY READY**

代码静态审计通过，所有已知 P0 和 P1 均已消除，测试脚本、并发设计、AI 请求链路均已整改并验证。但由于当前环境无法访问真实的 PostgreSQL 实例以及真实的 AI Provider API 密钥，导致针对这些组件的真实集成测试（如数据库的真实并发性能、AI真实响应结构等）被跳过。因此，发布前仍必须完成真实的 PostgreSQL 集成/并发测试以及真实的 AI Provider 冒烟测试。

---

## B. P0 问题

**1. 缺失数据库级唯一约束导致并发漏洞**
- **文件路径**: `backend/scripts/migrate.js`
- **函数/路由**: `migrate` (针对 `student_knowledge_states` 表)
- **实际风险**: 代码中依赖 `ON CONFLICT (user_id, knowledge_point_id)` 进行数据 upsert 操作，但在该表创建时及后续迁移中缺失了 `UNIQUE(user_id, knowledge_point_id)` 约束，导致并发写入时可能产生重复行，破坏学生状态数据的唯一性与一致性。
- **触发方式**: 多用户或单用户快速高频并发触发产生学习事件并首次初始化该知识点状态时。
- **修复状态**: 已修复。在 `migrate.js` 的 `student_knowledge_states` 迁移块中增加了 `DO $$ BEGIN ... END $$;` 动态添加约束的安全操作。
- **验证方式**: 代码静态审计确认唯一约束语句 `ALTER TABLE student_knowledge_states ADD CONSTRAINT student_knowledge_states_user_id_knowledge_point_id_key UNIQUE (user_id, knowledge_point_id);` 已被添加，`npm run test:unit` 测试通过。

**2. AI 接口部分变量未声明就使用导致 ReferenceError**
- **文件路径**: `backend/src/api/creationRoutes.js` 和 `backend/src/api/creationWorkbenchRoutes.js`
- **函数/路由**: `/api/creation/*` 和 `/api/creation-workbench/*` 多个路由。
- **实际风险**: 接口中尝试获取并验证 `poem`, `theme`, `genre`, `title`, `author` 等变量时，这些变量未从 `req.body` 解构定义，导致运行到该行直接抛出 ReferenceError，接口完全不可用，严重业务错误。
- **触发方式**: 任何客户端调用对应的 AI 创作接口即可触发。
- **修复状态**: 已修复。在所有遗漏的路由中补充了 `const { poem, title, author, genre, theme } = req.body;`。
- **验证方式**: 全局审查代码，确认已修复，单元测试通过。

---

## C. P1 问题

**1. 飞花令数据库匹配规则过于宽泛 (假绿)**
- **文件路径**: `backend/src/services/feihualingService.js`
- **函数/路由**: `validatePoemFromDB`
- **实际风险**: 只要输入的字符串（例如仅“明月”二字）作为子串被数据库内任意一首诗包含，就会被判定为真实诗句，降低了业务逻辑的真实性。
- **触发方式**: 飞花令对决时用户输入较短关键词。
- **修复状态**: 已修复。要求输入内容长度不小于4，且匹配逻辑从全文包含改为按标点切分单句，并且限制长度差不能大于2。
- **验证方式**: 静态审查飞花令验证逻辑代码，确认新逻辑有效限制了宽泛匹配。

**2. AI 路由未正确解析可选 Token 导致限流基于 IP 而非用户**
- **文件路径**: `backend/src/api/aiRoutes.js`
- **函数/路由**: 所有 AI 路由前置处理
- **实际风险**: `aiRateLimiter` 内部依赖 `req.user.userId` 来实现基于用户的限流。原代码在大量公开 AI 路由前未调用 `optionalAuthenticateToken`，导致 `req.user` 为空，限流器回退到 `req.ip` 限流。在网关环境或学校同一公网出口下会导致大面积误杀限流。
- **触发方式**: 任何用户调用未显式挂载 Auth 中间件的公共 AI 接口。
- **修复状态**: 已修复。在 `aiRoutes.js` 的所有具体路由挂载前，统一添加了 `router.use(optionalAuthenticateToken);`。
- **验证方式**: 代码审查确认中间件顺序正确（`optionalAuth` -> `aiRateLimiter` -> `handler`）。

**3. Frontend Timeout 与 Backend Deadline 倒挂**
- **文件路径**: `frontend/src/services/api.js`
- **函数/路由**: `TIMEOUTS` 配置
- **实际风险**: 前端的 `SHORT` Timeout 设置为 10s，`MEDIUM` 设置为 60s。而后端 `AIClient` 的默认 `totalDeadline` 也为 60s。如果在 60s 时刚好超时，前后端会产生竞争，导致前端提示网络超时，而后端可能在几毫秒后完成并写入缓存，但无法被正确处理。
- **触发方式**: 耗时较长的 AI 请求（如大模型分析、生图）。
- **修复状态**: 已修复。将前端 `SHORT` 调整为 15s，`MEDIUM` 调整为 75s，留出余量。
- **验证方式**: 静态审查确认前后端 Timeout 已拉开安全距离。

**4. 错误处理中原生 Error 被抛出而非标准的 AIError**
- **文件路径**: `backend/src/services/aiService.js`
- **函数/路由**: `callAIGenerateJSON`, `callZhipuGenerateJSON`, 各种 AI 功能函数
- **实际风险**: 在 AI 请求失败时（如 429、500 等）抛出了普通的 `Error`，这会导致 `AIClient` 内部的 Error Mapping 及后续的全局 `errorHandler` 无法识别特定错误，向客户端返回无意义的 500 而不是准确的 429 (Too Many Requests) 或 504 (Timeout)。
- **触发方式**: AI Provider 发生限流或超时。
- **修复状态**: 已修复。将 `aiService.js` 中的普通 `Error` 替换为抛出带准确 `AI_ERRORS` 枚举的 `AIError`。
- **验证方式**: `node tests/aiStabilityTest.js` 测试通过，各种 AI 异常被正确映射。

**5. AI 降级返回缺少 `degraded: true` 标识**
- **文件路径**: `backend/src/services/aiService.js` 与 `backend/tests/ragTutor.test.js`
- **函数/路由**: 各 AI 功能的降级 fallback (如 `getDimensionExplanation`, `getLearningAdvice`)
- **实际风险**: 当 AI 不可用时返回硬编码或基于数据库的保底数据，但缺少 `degraded: true` 标识，导致调用方无法区分这是真实的 AI 生成内容还是降级内容。
- **触发方式**: AI Provider 服务宕机。
- **修复状态**: 已修复。在 fallback 返回的对象中补充了 `degraded: true`，并将测试代码中的断言从 `_degraded` 修正为正式的 `degraded` 字段。
- **验证方式**: `npm run test:unit` 测试中 RAG 个性化教学的 fallback 断言通过。

---

## D. P2 建议

1. **缓存策略优化**: 当前 `backend/src/utils/cache.js` 中将文件缓存同步到内存缓存的策略在多实例 Node 部署下会产生不一致，建议未来接入 Redis 作为统一缓存。
2. **测试脚本清理**: `backend/scripts` 目录下虽然已清理了一批诊断与临时修复脚本，但仍有一些 `check*.js` 和 `diagnose*.js`，建议后续建立专门的运维命令集而非散落。
3. **Frontend 打包体积**: 运行 `npm run build` 时提示多个组件体积过大（如 `echarts`、`PoemChallenge`），建议进一步配置 Vite 的 `manualChunks` 进行拆包。

---

## E. 已验证 PASS 项

- **PostgreSQL-only runtime**: 全局未发现 SQLite 驱动或连接代码。
- **SQLite runtime absent**: SQLite 依赖及后门已完全移除。
- **Auth behavior**: JWT 认证中间件逻辑严谨，严格模式与可选模式分离。
- **IDOR audited scope**: 已排查教师接口及各种用户资源接口，均包含所属权或师生关联验证 (`assertTeacherCanAccessStudent`)。
- **Frontend localhost**: 生产构建产物 `backend/public/assets/` 下未扫描出真实泄漏的本机 IP (`127.0.0.1` / `localhost`)。
- **Frontend build**: 成功构建，无致命错误，构建产物未硬编码泄漏 API Key 或 JWT Secret。
- **AI error mapping**: `AIClient` 与 `errorHandler.js` 已完善 429、504、503 的 HTTP 状态码映射。
- **AI retry/deadline**: 前后端已拉开超时时间差，AIClient 具备带 deadline 的指数退避重试能力。
- **AI limiter**: 全局统一使用 `aiRateLimiter` 且在 `router.use(optionalAuthenticateToken)` 之后执行。
- **Mock/fake runtime**: 未发现以写死逻辑假装 AI 成功或无端返回假数据，降级均基于数据库事实并标记 `degraded: true`。
- **LearningEvent transaction**: `masteryUpdateEngine.js` 和 `learningEventService.js` 的事务流程正确。
- **event_key idempotency**: 前端生成的 `attemptId` 及后端的 `event_key` 在 `ON CONFLICT DO NOTHING` 中被正确应用以实现幂等性。
- **Mastery row locking**: `SELECT ... FOR UPDATE` 在事务中正确实现，防止并发更新错乱。
- **Migration**: 包含对 `student_knowledge_states` 的增量 UNIQUE 约束。
- **Seed/dev-seed separation**: `package.json` 中区分了正式 `npm run db:seed` 和开发 `npm run db:seed:dev`。
- **Health endpoints**: 包含 `/health/live` 和 `/health/ready`，后者真实探活数据库。

---

## F. 测试矩阵

| 测试项 | 状态 | 说明 |
|---|---|---|
| Unit tests | PASS | 50/50 结论全绿 |
| Assertions | 50 | |
| Frontend build | PASS | 构建无警告泄漏 |
| AI resilience | PASS | 13/13 `aiStabilityTest.js` 异常处理通过 |
| PostgreSQL integration | SKIPPED | 当前环境无 PG 实例 |
| PostgreSQL concurrency | SKIPPED | 当前环境无 PG 实例 |
| Real SiliconFlow | NOT RUN | 当前环境无真实 Key |
| Real Bailian | NOT RUN | 当前环境无真实 Key |

*(注意：测试脚本本身对缺失环境的降级判定已修正为 SKIPPED/NOT RUN，未计入 PASS 数量)*

---

## G. 未验证项

- Node 18 runtime（静态检查兼容 Node 18，未在 Node 18 runtime 实测，当前使用版本高于 18）。
- 真实 PostgreSQL（包括高并发下的 `FOR UPDATE` 行级锁真实压力测试）。
- 真实 AI Provider（包括 SiliconFlow 和 阿里云百炼的真实连通性和响应解析结构测试）。
- 真实反向代理部署（Nginx/Caddy 配置验证）。

---

## H. 修改文件

在最终审计期间实际修改的文件：
- `backend/scripts/migrate.js` (补充 UNIQUE 约束)
- `backend/src/services/feihualingService.js` (收紧飞花令验证规则)
- `backend/src/api/creationRoutes.js` (修复 req.body 变量未声明)
- `backend/src/api/creationWorkbenchRoutes.js` (修复 req.body 变量未声明)
- `backend/src/api/aiRoutes.js` (添加可选 Token 解析、去除个别不规范可选 Token)
- `backend/src/services/aiService.js` (抛出标准 AIError，补充 degraded 标识)
- `frontend/src/services/api.js` (拉开前后端 Timeout 余量)
- `backend/tests/ragTutor.test.js` (修正断言字段名称 `_degraded` -> `degraded`)
- `backend/tests/run-all-tests.js` (修正缺失 PG 时的报告统计)
- `backend/package.json` (拆分 seed:dev 命令)
- `README.md` (修正命令文档)
- 删除了一系列无用的 `check*.js`, `diagnose*.js`, `test*.js` 等诊断脚本。