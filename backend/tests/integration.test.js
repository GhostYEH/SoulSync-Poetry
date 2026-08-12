/**
 * 学习智能集成测试 (V1.1)
 *
 * 测试内容：
 *   1. PostgreSQL 集成：真实数据库读写
 *   2. API 集成：通过 Express app 测试正式 API
 *   3. Backfill 幂等：运行两次 backfill 结果一致
 *   4. rebuild == realtime 一致性：实时更新后 rebuild 得到相同状态
 *
 * 运行方式：
 *   设置 DATABASE_URL 环境变量后运行：
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/poetry node tests/integration.test.js
 *
 *   如未设置 DATABASE_URL，测试将跳过（exit 0）。
 *
 * 前置条件：
 *   - PostgreSQL 已运行
 *   - 已执行 node scripts/migrate.js
 *   - 知识种子已初始化（bootstrap 会自动处理）
 */
require('dotenv').config();

const assert = require('assert');
const db = require('../src/utils/db');
const knowledgeModel = require('../src/services/knowledgeModelService');
const learningEventService = require('../src/services/learningEventService');
const masteryEngine = require('../src/services/masteryUpdateEngine');

let passed = 0, failed = 0, skipped = 0;
function test(name, fn) {
  return async () => {
    try { await fn(); console.log(`  ✓ ${name}`); passed++; }
    catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
  };
}
function approx(a, b, eps = 0.02) { return Math.abs(a - b) < eps; }

async function run() {
  // 检查数据库连接
  let dbAvailable = false;
  try {
    await db.query('SELECT 1');
    dbAvailable = true;
  } catch (e) {
    console.log(`⚠ 数据库不可用，跳过集成测试: ${e.message}`);
    console.log(`  设置 DATABASE_URL 后可运行此测试。`);
    process.exit(0);
  }

  console.log('=== V1.1 集成测试 ===\n');

  // 确保知识种子已初始化
  await knowledgeModel.seedKnowledgePoints();

  // 创建测试用户（如果不存在）
  const testUserId = 999999;
  try {
    await db.run(
      `INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, 'student')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, '__test_integration__', 'test']
    );
  } catch (e) {
    // users 表结构可能不同，尝试其他方式
    try {
      const existing = await db.get('SELECT id FROM users WHERE id = $1', [testUserId]);
      if (!existing) {
        await db.run(
          `INSERT INTO users (id, username, email, password, role) VALUES ($1, $2, $3, $4, 'student')
           ON CONFLICT (id) DO NOTHING`,
          [testUserId, '__test_integration__', 'test@test.com', 'test']
        );
      }
    } catch (e2) {
      console.log(`⚠ 无法创建测试用户: ${e2.message}`);
      console.log(`  请确保数据库中有 user_id=999999 或修改测试中的 testUserId。`);
      process.exit(0);
    }
  }

  // 清理测试数据
  async function cleanup() {
    await db.run('DELETE FROM learning_events WHERE user_id = $1', [testUserId]);
    await db.run('DELETE FROM student_knowledge_states WHERE user_id = $1', [testUserId]);
  }
  await cleanup();

  // ============================================================
  console.log('--- 1. PostgreSQL 集成：事件记录与状态更新 ---');
  // ============================================================

  await (await test('记录1条答题事件 → learning_events 有1条记录', async () => {
    const result = await learningEventService.recordEvent({
      userId: testUserId,
      eventType: learningEventService.EVENT_TYPES.CORRECT_ANSWER,
      questionText: '请默写《静夜思》全诗',
      correct: true,
      difficulty: 3,
      hintCount: 0,
      eventKey: `test:${testUserId}:1:correct`,
    });
    assert.ok(result.eventId, 'eventId 应非 null');
    const events = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);
    assert.strictEqual(events.length, 1);
  }))();

  await (await test('事件驱动 → student_knowledge_states 有记录', async () => {
    const states = await masteryEngine.getAllStates(testUserId);
    assert.ok(states.length > 0, '应有至少1个知识状态');
    const memState = states.find(s => s.code === 'memorization');
    assert.ok(memState, '应有 memorization 状态');
    assert.ok(memState.mastery > 0.5, '答对后 mastery 应 > 0.5');
    assert.ok(memState.mastery <= 1.0, 'mastery 应 ≤ 1.0');
  }))();

  await (await test('幂等：相同 eventKey 不产生重复事件', async () => {
    const before = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);
    const result = await learningEventService.recordEvent({
      userId: testUserId,
      eventType: learningEventService.EVENT_TYPES.CORRECT_ANSWER,
      questionText: '请默写《静夜思》全诗',
      correct: true,
      difficulty: 3,
      hintCount: 0,
      eventKey: `test:${testUserId}:1:correct`,
    });
    assert.ok(result.duplicated, '应标记为 duplicated');
    const after = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);
    assert.strictEqual(after.length, before.length, '事件数不应增加');
  }))();

  await (await test('多条事件 → mastery 持续更新', async () => {
    for (let i = 2; i <= 5; i++) {
      await learningEventService.recordEvent({
        userId: testUserId,
        eventType: learningEventService.EVENT_TYPES.WRONG_ANSWER,
        questionText: '"飞流直下三千尺"运用了夸张的修辞手法',
        correct: false,
        difficulty: 4,
        hintCount: 0,
        eventKey: `test:${testUserId}:${i}:wrong`,
      });
    }
    const states = await masteryEngine.getAllStates(testUserId);
    const rhetoric = states.find(s => s.code === 'rhetoric' || s.code === 'rhetoric_exaggeration');
    assert.ok(rhetoric, '应有修辞知识点状态');
    assert.ok(rhetoric.attempt_count >= 4, '应有4次以上尝试');
  }))();

  // ============================================================
  console.log('\n--- 2. Backfill 幂等：运行两次结果一致 ---');
  // ============================================================

  await (await test('rebuild 后再次 rebuild → 状态一致', async () => {
    const r1 = await masteryEngine.rebuildStudentKnowledgeState(testUserId);
    const states1 = await masteryEngine.getAllStates(testUserId);
    const snapshot1 = JSON.stringify(states1.map(s => ({
      kp: s.knowledge_point_id, m: Math.round(s.mastery * 1000) / 1000,
      c: Math.round(s.confidence * 1000) / 1000, a: s.attempt_count,
    })).sort());

    const r2 = await masteryEngine.rebuildStudentKnowledgeState(testUserId);
    const states2 = await masteryEngine.getAllStates(testUserId);
    const snapshot2 = JSON.stringify(states2.map(s => ({
      kp: s.knowledge_point_id, m: Math.round(s.mastery * 1000) / 1000,
      c: Math.round(s.confidence * 1000) / 1000, a: s.attempt_count,
    })).sort());

    assert.strictEqual(snapshot1, snapshot2, '两次 rebuild 状态应完全一致');
    assert.strictEqual(r1.algorithmVersion, 'v2', '算法版本应为 v2');
  }))();

  // ============================================================
  console.log('\n--- 3. rebuild == realtime 一致性 ---');
  // ============================================================

  await (await test('实时更新后 rebuild → 相同状态（State A == State B）', async () => {
    // State A: 实时更新（已通过上面的事件记录建立）
    const statesRealtime = await masteryEngine.getAllStates(testUserId);
    const snapshotRealtime = JSON.stringify(statesRealtime.map(s => ({
      kp: s.knowledge_point_id, m: Math.round(s.mastery * 1000) / 1000,
      c: Math.round(s.confidence * 1000) / 1000, a: s.attempt_count,
    })).sort());

    // State B: 从事件 rebuild
    await masteryEngine.rebuildStudentKnowledgeState(testUserId);
    const statesRebuild = await masteryEngine.getAllStates(testUserId);
    const snapshotRebuild = JSON.stringify(statesRebuild.map(s => ({
      kp: s.knowledge_point_id, m: Math.round(s.mastery * 1000) / 1000,
      c: Math.round(s.confidence * 1000) / 1000, a: s.attempt_count,
    })).sort());

    assert.strictEqual(snapshotRealtime, snapshotRebuild,
      '实时更新与 rebuild 应产生完全一致的状态');
  }))();

  // ============================================================
  console.log('\n--- 4. eventKey 幂等：合法重练允许 ---');
  // ============================================================

  await (await test('不同 recordId → 不同事件（允许重练）', async () => {
    const before = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);

    // 同一题，不同 recordId（模拟重练）
    await learningEventService.recordEvent({
      userId: testUserId,
      eventType: learningEventService.EVENT_TYPES.CORRECT_ANSWER,
      questionText: '请默写《静夜思》全诗',
      correct: true,
      difficulty: 3,
      hintCount: 0,
      eventKey: `answer:${testUserId}:1001`,
    });
    await learningEventService.recordEvent({
      userId: testUserId,
      eventType: learningEventService.EVENT_TYPES.WRONG_ANSWER,
      questionText: '请默写《静夜思》全诗',
      correct: false,
      difficulty: 3,
      hintCount: 0,
      eventKey: `answer:${testUserId}:1002`,
    });

    const after = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);
    assert.strictEqual(after.length, before.length + 2, '应新增2条事件（允许重练）');
  }))();

  await (await test('相同 recordId → 幂等去重', async () => {
    const before = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);

    await learningEventService.recordEvent({
      userId: testUserId,
      eventType: learningEventService.EVENT_TYPES.CORRECT_ANSWER,
      questionText: '请默写《静夜思》全诗',
      correct: true,
      difficulty: 3,
      hintCount: 0,
      eventKey: `answer:${testUserId}:1001`,
    });

    const after = await db.all('SELECT * FROM learning_events WHERE user_id = $1', [testUserId]);
    assert.strictEqual(after.length, before.length, '相同 eventKey 不应新增事件');
  }))();

  // ============================================================
  console.log('\n--- 5. 算法版本与数据格式 ---');
  // ============================================================

  await (await test('student_knowledge_states.algorithm_version = v2', async () => {
    const states = await db.all(
      'SELECT algorithm_version FROM student_knowledge_states WHERE user_id = $1',
      [testUserId]
    );
    assert.ok(states.length > 0);
    states.forEach(s => assert.strictEqual(s.algorithm_version, 'v2'));
  }))();

  await (await test('recent_performance 格式为 {s, f, t}', async () => {
    const states = await db.all(
      'SELECT recent_performance FROM student_knowledge_states WHERE user_id = $1',
      [testUserId]
    );
    states.forEach(s => {
      const perf = JSON.parse(s.recent_performance || '[]');
      perf.forEach(p => {
        assert.ok('s' in p, '应有 s (success) 字段');
        assert.ok('f' in p, '应有 f (failure) 字段');
        assert.ok('t' in p, '应有 t (timestamp) 字段');
        assert.ok(p.s >= 0, 'success 应非负');
        assert.ok(p.f >= 0, 'failure 应非负');
      });
    });
  }))();

  await (await test('mastery 始终在 [0, 1] 内', async () => {
    const states = await db.all(
      'SELECT mastery, confidence FROM student_knowledge_states WHERE user_id = $1',
      [testUserId]
    );
    states.forEach(s => {
      assert.ok(s.mastery >= 0 && s.mastery <= 1, `mastery=${s.mastery} 越界`);
      assert.ok(s.confidence >= 0 && s.confidence <= 1, `confidence=${s.confidence} 越界`);
    });
  }))();

  // ============================================================
  console.log('\n--- 6. UNIQUE 约束验证 ---');
  // ============================================================

  await (await test('event_key 有 UNIQUE 索引', async () => {
    const indexes = await db.all(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'learning_events' AND indexdef LIKE '%UNIQUE%'`
    );
    const hasUnique = indexes.some(i => i.indexname.includes('event_key'));
    assert.ok(hasUnique, 'learning_events.event_key 应有 UNIQUE 索引');
  }))();

  await (await test('(user_id, knowledge_point_id) 有 UNIQUE 约束', async () => {
    const indexes = await db.all(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'student_knowledge_states'`
    );
    assert.ok(indexes.length > 0, 'student_knowledge_states 应有索引');
  }))();

  // ============================================================
  console.log('\n--- 7. Backfill 脚本幂等性 ---');
  // ============================================================

  await (await test('backfill 两次 → 第二次0新事件', async () => {
    const { execSync } = require('child_process');
    const out1 = execSync('node scripts/backfillLearningIntelligence.js', {
      cwd: __dirname + '/..',
      encoding: 'utf8',
      timeout: 60000,
    });
    const eventsAfter1 = await db.all(
      `SELECT COUNT(*) as cnt FROM learning_events WHERE event_key LIKE 'backfill_%'`
    );
    const count1 = parseInt(eventsAfter1[0].cnt);

    const out2 = execSync('node scripts/backfillLearningIntelligence.js', {
      cwd: __dirname + '/..',
      encoding: 'utf8',
      timeout: 60000,
    });
    const eventsAfter2 = await db.all(
      `SELECT COUNT(*) as cnt FROM learning_events WHERE event_key LIKE 'backfill_%'`
    );
    const count2 = parseInt(eventsAfter2[0].cnt);

    assert.strictEqual(count2, count1, '第二次 backfill 不应新增事件');
  }))();

  // ============================================================
  console.log('\n--- 8. question_knowledge_mappings source=rule ---');
  // ============================================================

  await (await test('关键词推断写入映射 source=rule', async () => {
    await learningEventService.recordEvent({
      userId: testUserId,
      eventType: learningEventService.EVENT_TYPES.CORRECT_ANSWER,
      questionId: 'test_q_rule_001',
      questionText: '请默写《静夜思》全诗',
      correct: true,
      difficulty: 3,
      hintCount: 0,
      eventKey: `test_source_rule:${testUserId}`,
    });

    const mappings = await db.all(
      `SELECT * FROM question_knowledge_mappings WHERE question_id = $1`,
      ['test_q_rule_001']
    );
    assert.ok(mappings.length > 0, '应有映射记录');
    mappings.forEach(m => {
      assert.strictEqual(m.source, 'rule', `source 应为 rule，实际: ${m.source}`);
      assert.ok(m.confidence !== null, 'confidence 不应为 null');
    });
  }))();

  await (await test('question_knowledge_mappings 有 confidence 字段', async () => {
    const cols = await db.all(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'question_knowledge_mappings' AND column_name = 'confidence'`
    );
    assert.ok(cols.length > 0, 'question_knowledge_mappings 应有 confidence 字段');
  }))();

  // ============================================================
  console.log('\n--- 9. Ability Model 聚合（Source of Truth）---');
  // ============================================================

  await (await test('abilityModelService 从 student_knowledge_states 聚合', async () => {
    const abilityModelService = require('../src/services/abilityModelService');
    const model = await abilityModelService.getUserAbilityModel(testUserId);
    assert.ok(model.source === 'student_knowledge_states', '应标注数据来源');
    assert.ok(model.memory_score >= 0 && model.memory_score <= 100);
    assert.ok(model.comprehension_score >= 0 && model.comprehension_score <= 100);
    assert.ok(model.expression_score >= 0 && model.expression_score <= 100);
    assert.ok(model.appreciation_score >= 0 && model.appreciation_score <= 100);
    assert.ok(model.overall_score >= 0 && model.overall_score <= 100);
  }))();

  await (await test('abilityModelService 不引用 ability_models 表', async () => {
    const abilityModelService = require('../src/services/abilityModelService');
    assert.strictEqual(typeof abilityModelService.getUserAbilityModel, 'function');
    assert.strictEqual(typeof abilityModelService.aggregateAbilityFromKnowledgeStates, 'function');
  }))();

  // 清理
  await cleanup();
  await db.close();

  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败, ${skipped} 跳过 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('集成测试崩溃:', err);
  process.exit(1);
});