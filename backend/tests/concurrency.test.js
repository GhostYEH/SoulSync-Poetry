const assert = require('assert');

async function runTest() {
  if (process.env.DB_TYPE === 'sqlite') {
    console.log('SKIPPED: PostgreSQL concurrency integration test skipped because DB_TYPE is sqlite');
    return;
  }
  
  const { EVENT_TYPES, recordEvent } = require('../src/services/learningEventService');
  const { updateFromEvent, getState } = require('../src/services/masteryUpdateEngine');
  
  const db = require('../src/utils/db');
  
  // 检查是否连接了 PostgreSQL
  if (!db.isPostgres()) {
    if (process.argv.includes('--require-db')) {
      console.error('FAIL: PostgreSQL is required for this test but not available.');
      process.exit(1);
    }
    console.log('SKIPPED: Not running PostgreSQL, skip concurrency tests.');
    return;
  }

  // 1. 初始化和清理
  try {
    await db.run(`DELETE FROM learning_events`);
    await db.run(`DELETE FROM student_knowledge_states`);
  } catch (err) {
    if (process.argv.includes('--require-db')) {
      console.error('FAIL: PostgreSQL connection failed but --require-db was specified.');
      process.exit(1);
    }
    console.log('SKIPPED: Not running PostgreSQL (connection failed), skip concurrency tests.');
    return;
  }
  
  const userId = 100;
  const kpId = 999;
  const kpCodes = ['test_kp'];
  
  // mock knowledgeModel.getKnowledgePointIds
  const knowledgeModel = require('../src/services/knowledgeModelService');
  knowledgeModel.getKnowledgePointIds = async () => [kpId];

  // 2. 测试1：相同 eventKey 并发10次
  console.log('=== 测试1：相同 eventKey 并发10次 ===');
  let promises = [];
  const CONCURRENCY = 10;
  const attemptId1 = 'attempt_12345';
  
  for (let i = 0; i < CONCURRENCY; i++) {
    promises.push(recordEvent({
      userId,
      eventType: EVENT_TYPES.ANSWER_QUESTION,
      knowledgePoints: kpCodes,
      correct: true,
      difficulty: 3,
      eventKey: `test:${userId}:${attemptId1}`,
      createdAt: new Date()
    }));
  }

  let results = await Promise.allSettled(promises);
  
  let events = await db.all(`SELECT * FROM learning_events`);
  assert.strictEqual(events.length, 1, '重复提交应该只有1条事件被记录');

  let state = await getState(userId, kpId);
  assert.ok(state, '状态应该被创建');
  assert.strictEqual(state.attempt_count, 1, '并发提交时只应更新一次 attempt_count');
  assert.strictEqual(state.correct_count, 1, '并发提交时只应更新一次 correct_count');
  
  let duplicatedCount = results.filter(r => r.status === 'fulfilled' && r.value.duplicated).length;
  assert.strictEqual(duplicatedCount, 9, '应该有 9 个请求被识别为重复(duplicated=true)');
  console.log('  ✓ 测试1通过');

  // 3. 测试2：不同 eventKey 并发10次
  console.log('=== 测试2：不同 eventKey 并发10次 ===');
  promises = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    promises.push(recordEvent({
      userId,
      eventType: EVENT_TYPES.ANSWER_QUESTION,
      knowledgePoints: kpCodes,
      correct: true,
      difficulty: 3,
      eventKey: `test:${userId}:attempt_diff_${i}`,
      createdAt: new Date()
    }));
  }

  await Promise.allSettled(promises);
  
  events = await db.all(`SELECT * FROM learning_events`);
  assert.strictEqual(events.length, 11, '总共应该有11条事件被记录'); // 测试1有1条

  state = await getState(userId, kpId);
  assert.strictEqual(state.attempt_count, 11, 'attempt_count 应该为 11');
  assert.strictEqual(state.correct_count, 11, 'correct_count 应该为 11');
  console.log('  ✓ 测试2通过');

  // 4. 测试3：事务回滚
  console.log('=== 测试3：事务回滚 ===');
  const brokenAttemptId = 'attempt_broken';
  
  const originalUpdate = require('../src/services/masteryUpdateEngine').updateFromEvent;
  require('../src/services/masteryUpdateEngine').updateFromEvent = async () => {
    throw new Error('Simulated Mastery Update Error');
  };

  try {
    await recordEvent({
      userId,
      eventType: EVENT_TYPES.ANSWER_QUESTION,
      knowledgePoints: kpCodes,
      correct: true,
      difficulty: 3,
      eventKey: `test:${userId}:${brokenAttemptId}`,
      createdAt: new Date()
    });
    assert.fail('应该抛出异常');
  } catch (err) {
    assert.strictEqual(err.message, 'Simulated Mastery Update Error');
  }

  let brokenEvents = await db.all(`SELECT * FROM learning_events WHERE event_key = $1`, [`test:${userId}:${brokenAttemptId}`]);
  assert.strictEqual(brokenEvents.length, 0, '事务中途失败，learning_event 应该回滚');
  console.log('  ✓ 测试3通过');

  // 5. 测试4：失败后相同 eventKey 重试
  console.log('=== 测试4：失败后相同 eventKey 重试 ===');
  require('../src/services/masteryUpdateEngine').updateFromEvent = originalUpdate; // 恢复正常

  await recordEvent({
    userId,
    eventType: EVENT_TYPES.ANSWER_QUESTION,
    knowledgePoints: kpCodes,
    correct: true,
    difficulty: 3,
    eventKey: `test:${userId}:${brokenAttemptId}`, // 重试刚才失败的 eventKey
    createdAt: new Date()
  });

  brokenEvents = await db.all(`SELECT * FROM learning_events WHERE event_key = $1`, [`test:${userId}:${brokenAttemptId}`]);
  assert.strictEqual(brokenEvents.length, 1, '重试成功，learning_event 应该记录 1 条');
  state = await getState(userId, kpId);
  assert.strictEqual(state.attempt_count, 12, '重试成功，mastery 更新 1 次');
  console.log('  ✓ 测试4通过');

  // 6. 测试5：已成功事件重复重试
  console.log('=== 测试5：已成功事件重复重试 ===');
  const retryResult = await recordEvent({
    userId,
    eventType: EVENT_TYPES.ANSWER_QUESTION,
    knowledgePoints: kpCodes,
    correct: true,
    difficulty: 3,
    eventKey: `test:${userId}:${brokenAttemptId}`, // 再次重试已成功的 eventKey
    createdAt: new Date()
  });

  assert.strictEqual(retryResult.duplicated, true, '应该返回 duplicated=true');
  brokenEvents = await db.all(`SELECT * FROM learning_events WHERE event_key = $1`, [`test:${userId}:${brokenAttemptId}`]);
  assert.strictEqual(brokenEvents.length, 1, 'LearningEvent 不增加');
  state = await getState(userId, kpId);
  assert.strictEqual(state.attempt_count, 12, 'Mastery 不变化');
  console.log('  ✓ 测试5通过');

  // 7. 测试6：首次创建竞争
  console.log('=== 测试6：首次创建 StudentKnowledgeState 的竞争处理 ===');
  const newUserId = 101;
  const newKpId = 998;
  knowledgeModel.getKnowledgePointIds = async () => [newKpId];
  promises = [];
  
  for (let i = 0; i < CONCURRENCY; i++) {
    promises.push(recordEvent({
      userId: newUserId,
      eventType: EVENT_TYPES.ANSWER_QUESTION,
      knowledgePoints: ['new_kp'],
      correct: true,
      difficulty: 3,
      eventKey: `test:${newUserId}:first_create_${i}`, // 不同的 eventKey，但同一学生和知识点
      createdAt: new Date()
    }));
  }

  await Promise.allSettled(promises);
  
  let newStates = await db.all(`SELECT * FROM student_knowledge_states WHERE user_id = $1 AND knowledge_point_id = $2`, [newUserId, newKpId]);
  assert.strictEqual(newStates.length, 1, '只允许有一条 StudentKnowledgeState');
  assert.strictEqual(newStates[0].attempt_count, CONCURRENCY, '10个事件应该全部被累加到 mastery 中');
  console.log('  ✓ 测试6通过');

  await db.close();
  
  console.log('所有 PostgreSQL 真实并发和事务测试通过');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});