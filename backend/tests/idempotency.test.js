/**
 * eventKey 幂等性单元测试
 *
 * 核心验证：
 *   同一次真实学习行为的 HTTP 重试 → 相同 eventKey
 *   不同时间重新学习 → 不同 eventKey
 *
 * 三种业务：
 *   answer:  eventKey = `answer:${userId}:${clientAttemptId}`
 *   recite:  eventKey = `recite:${userId}:${attemptId}`
 *   feihua:  eventKey = `feihua:${userId}:${gameSessionId}`
 *
 * 运行: node tests/idempotency.test.js
 */
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

function buildAnswerEventKey(userId, clientAttemptId, recordId) {
  const attemptKey = clientAttemptId || `legacy_record_${recordId}`;
  return `answer:${userId}:${attemptKey}`;
}

function buildReciteEventKey(userId, attemptId, poemId) {
  const reciteKey = attemptId || `legacy_${poemId}_${Date.now()}`;
  return `recite:${userId}:${reciteKey}`;
}

function buildFeihuaEventKey(userId, gameSessionId, gameRecordId) {
  const sessionKey = gameSessionId || `legacy_game_${gameRecordId}`;
  return `feihua:${userId}:${sessionKey}`;
}

const userId = 42;

console.log('=== Answer eventKey 幂等性 ===');

test('相同 clientAttemptId → 相同 eventKey（HTTP 重试幂等）', () => {
  const attemptId = uuidv4();
  const key1 = buildAnswerEventKey(userId, attemptId, 1001);
  const key2 = buildAnswerEventKey(userId, attemptId, 1002);
  assert.strictEqual(key1, key2, '相同 attemptId 必须产生相同 eventKey');
});

test('不同 clientAttemptId → 不同 eventKey（允许重练）', () => {
  const key1 = buildAnswerEventKey(userId, uuidv4(), 1001);
  const key2 = buildAnswerEventKey(userId, uuidv4(), 1002);
  assert.notStrictEqual(key1, key2);
});

test('eventKey 不含 recordId（recordId 每次新建不影响幂等）', () => {
  const attemptId = uuidv4();
  const key = buildAnswerEventKey(userId, attemptId, 99999);
  assert.ok(!key.includes('99999'), 'eventKey 不应包含 recordId');
});

test('eventKey 不含 timestamp', () => {
  const attemptId = uuidv4();
  const key = buildAnswerEventKey(userId, attemptId, 1);
  assert.ok(!key.includes(String(Date.now())));
});

test('无 clientAttemptId → 回退到 recordId（不保证幂等，兼容旧前端）', () => {
  const key = buildAnswerEventKey(userId, null, 1001);
  assert.ok(key.includes('1001'), '回退时应包含 recordId');
});

test('100 次 retry 同一 attemptId → 100 次相同 eventKey', () => {
  const attemptId = uuidv4();
  const keys = new Set();
  for (let i = 0; i < 100; i++) {
    keys.add(buildAnswerEventKey(userId, attemptId, i + 1));
  }
  assert.strictEqual(keys.size, 1, '100 次 retry 应产生 1 个唯一 key');
});

console.log('\n=== Recitation eventKey 幂等性 ===');

test('相同 attemptId → 相同 eventKey（HTTP 重试幂等）', () => {
  const attemptId = uuidv4();
  const key1 = buildReciteEventKey(userId, attemptId, 5);
  const key2 = buildReciteEventKey(userId, attemptId, 5);
  assert.strictEqual(key1, key2);
});

test('不同 attemptId → 不同 eventKey（允许重新背诵）', () => {
  const key1 = buildReciteEventKey(userId, uuidv4(), 5);
  const key2 = buildReciteEventKey(userId, uuidv4(), 5);
  assert.notStrictEqual(key1, key2);
});

test('eventKey 不含 timestamp（旧设计 reciteTs=Date.now() 已移除）', () => {
  const attemptId = uuidv4();
  const key = buildReciteEventKey(userId, attemptId, 5);
  assert.ok(!key.includes(String(Date.now())), '不应包含 timestamp');
});

test('eventKey 不含 poem_id（同一首诗可多次背诵）', () => {
  const attemptId = uuidv4();
  const key = buildReciteEventKey(userId, attemptId, 5);
  assert.ok(!key.match(/:5$/), 'eventKey 不应以 poem_id 结尾');
});

test('无 attemptId → 回退（不保证幂等，兼容旧前端）', () => {
  const key = buildReciteEventKey(userId, null, 5);
  assert.ok(key.includes('legacy'), '回退时应包含 legacy 标记');
});

test('100 次 retry 同一 attemptId → 100 次相同 eventKey', () => {
  const attemptId = uuidv4();
  const keys = new Set();
  for (let i = 0; i < 100; i++) {
    keys.add(buildReciteEventKey(userId, attemptId, 5));
  }
  assert.strictEqual(keys.size, 1);
});

console.log('\n=== Feihualing eventKey 幂等性 ===');

test('相同 gameSessionId → 相同 eventKey（HTTP 重试幂等）', () => {
  const sessionId = uuidv4();
  const key1 = buildFeihuaEventKey(userId, sessionId, 1001);
  const key2 = buildFeihuaEventKey(userId, sessionId, 1002);
  assert.strictEqual(key1, key2);
});

test('不同 gameSessionId → 不同 eventKey（允许不同局游戏）', () => {
  const key1 = buildFeihuaEventKey(userId, uuidv4(), 1001);
  const key2 = buildFeihuaEventKey(userId, uuidv4(), 1002);
  assert.notStrictEqual(key1, key2);
});

test('eventKey 不含 gameRecord.id（gameRecord.id 每次新建不影响幂等）', () => {
  const sessionId = uuidv4();
  const key = buildFeihuaEventKey(userId, sessionId, 99999);
  assert.ok(!key.includes('99999'));
});

test('无 gameSessionId → 回退到 gameRecord.id（不保证幂等）', () => {
  const key = buildFeihuaEventKey(userId, null, 1001);
  assert.ok(key.includes('1001'));
});

test('100 次 retry 同一 gameSessionId → 100 次相同 eventKey', () => {
  const sessionId = uuidv4();
  const keys = new Set();
  for (let i = 0; i < 100; i++) {
    keys.add(buildFeihuaEventKey(userId, sessionId, i + 1));
  }
  assert.strictEqual(keys.size, 1);
});

console.log('\n=== 幂等 vs Unique 严格区分 ===');

test('幂等 ≠ Unique：Unique 每次不同，幂等 retry 时相同', () => {
  const attemptId = uuidv4();
  const retryKey1 = buildAnswerEventKey(userId, attemptId, 1);
  const retryKey2 = buildAnswerEventKey(userId, attemptId, 2);
  const newAttemptKey = buildAnswerEventKey(userId, uuidv4(), 3);

  assert.strictEqual(retryKey1, retryKey2, 'retry 必须相同');
  assert.notStrictEqual(retryKey1, newAttemptKey, '新 attempt 必须不同');
});

test('UUID attemptId 长度36 → eventKey 稳定', () => {
  const attemptId = uuidv4();
  assert.strictEqual(attemptId.length, 36);
  const key = buildAnswerEventKey(userId, attemptId, 1);
  assert.ok(key.length > 36);
});

console.log('\n=== 三种业务 eventKey 格式统一 ===');

test('answer eventKey 格式: answer:{userId}:{attemptKey}', () => {
  const key = buildAnswerEventKey(userId, uuidv4(), 1);
  assert.ok(key.startsWith(`answer:${userId}:`));
});

test('recite eventKey 格式: recite:{userId}:{attemptKey}', () => {
  const key = buildReciteEventKey(userId, uuidv4(), 1);
  assert.ok(key.startsWith(`recite:${userId}:`));
});

test('feihua eventKey 格式: feihua:{userId}:{sessionKey}', () => {
  const key = buildFeihuaEventKey(userId, uuidv4(), 1);
  assert.ok(key.startsWith(`feihua:${userId}:`));
});

test('三种业务 eventKey 互不冲突', () => {
  const attemptId = uuidv4();
  const aKey = buildAnswerEventKey(userId, attemptId, 1);
  const rKey = buildReciteEventKey(userId, attemptId, 1);
  const fKey = buildFeihuaEventKey(userId, attemptId, 1);
  assert.notStrictEqual(aKey, rKey);
  assert.notStrictEqual(aKey, fKey);
  assert.notStrictEqual(rKey, fKey);
});

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);