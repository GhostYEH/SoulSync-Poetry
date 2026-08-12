/**
 * Personalized Tutor 认证安全测试（P0 串用户防护）
 *
 * 验证：
 *   1. no token → 401
 *   2. invalid token → 401
 *   3. expired token → 401
 *   4. valid user A token → service 收到 userA.id（非 1）
 *   5. valid user B token → service 收到 userB.id（非 1，且 ≠ userA.id）
 *
 * 运行: node tests/personalizedTutorAuth.test.js
 */
const assert = require('assert');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../src/middleware/auth');
const config = require('../src/config/config');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function mockRes() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}
function mockReq(headers = {}) {
  return { headers, body: {}, query: {} };
}

const USER_A = { userId: 101, username: 'studentA' };
const USER_B = { userId: 202, username: 'studentB' };
const TOKEN_A = jwt.sign(USER_A, config.jwt.secret, { expiresIn: '1h' });
const TOKEN_B = jwt.sign(USER_B, config.jwt.secret, { expiresIn: '1h' });
const EXPIRED_TOKEN = jwt.sign(USER_A, config.jwt.secret, { expiresIn: '-1s' });
const INVALID_TOKEN = 'invalid.token.here';

console.log('=== Personalized Tutor 认证测试 ===\n');

console.log('--- 未认证请求必须 401 ---');
test('no token → 401 + NO_TOKEN', () => {
  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'NO_TOKEN');
  assert.strictEqual(nextCalled, false);
});

test('invalid token → 401 + TOKEN_INVALID', () => {
  const req = mockReq({ authorization: `Bearer ${INVALID_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'TOKEN_INVALID');
  assert.strictEqual(nextCalled, false);
});

test('expired token → 401 + TOKEN_EXPIRED', () => {
  const req = mockReq({ authorization: `Bearer ${EXPIRED_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
  assert.strictEqual(nextCalled, false);
});

console.log('\n--- 合法用户 token 传递真实 userId ---');
test('user A token → req.user.userId = 101（非 1）', () => {
  const req = mockReq({ authorization: `Bearer ${TOKEN_A}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.userId, 101);
  assert.notStrictEqual(req.user.userId, 1);
});

test('user B token → req.user.userId = 202（非 1）', () => {
  const req = mockReq({ authorization: `Bearer ${TOKEN_B}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.userId, 202);
  assert.notStrictEqual(req.user.userId, 1);
});

test('user A 和 user B 的 userId 严格不同', () => {
  const reqA = mockReq({ authorization: `Bearer ${TOKEN_A}` });
  const reqB = mockReq({ authorization: `Bearer ${TOKEN_B}` });
  authenticateToken(reqA, mockRes(), () => {});
  authenticateToken(reqB, mockRes(), () => {});
  assert.notStrictEqual(reqA.user.userId, reqB.user.userId);
  assert.notStrictEqual(reqA.user.userId, 1);
  assert.notStrictEqual(reqB.user.userId, 1);
});

console.log('\n--- 串用户防护回归 ---');
test('未认证时 req.user 不会被设置为默认用户', () => {
  const req = mockReq();
  const res = mockRes();
  authenticateToken(req, res, () => {});
  assert.ok(!req.user, 'req.user 不应存在');
  assert.strictEqual(res.statusCode, 401);
});

test('无效 token 时 req.user 不会被设置为默认用户', () => {
  const req = mockReq({ authorization: `Bearer ${INVALID_TOKEN}` });
  const res = mockRes();
  authenticateToken(req, res, () => {});
  assert.ok(!req.user, 'req.user 不应存在');
  assert.strictEqual(res.statusCode, 401);
});

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);