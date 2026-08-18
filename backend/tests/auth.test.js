/**
 * 认证中间件单元测试
 *
 * 验证 P0 安全修复：
 *   no token → 401
 *   invalid token → 401
 *   expired token → 401
 *   valid token → 200 (req.user set)
 *   optionalAuthenticateToken: no/invalid token → req.user = null, next()
 *   optionalAuthenticateToken: valid token → req.user set, next()
 *
 * 运行: node tests/auth.test.js
 */
const assert = require('assert');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../src/middleware/auth');
const { optionalAuthenticateToken } = require('../src/middleware/auth');
const config = require('../src/config/config');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  return res;
}

function mockReq(headers = {}) {
  return { headers, body: {}, query: {} };
}

const VALID_TOKEN = jwt.sign({ userId: 42, username: 'alice' }, config.jwt.secret, { expiresIn: '1h' });
const EXPIRED_TOKEN = jwt.sign({ userId: 42, username: 'alice' }, config.jwt.secret, { expiresIn: '-1s' });
const INVALID_TOKEN = 'invalid.token.here';

console.log('=== authenticateToken（严格模式）===');

test('无 token → 401 + NO_TOKEN', () => {
  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'NO_TOKEN');
  assert.strictEqual(nextCalled, false);
});

test('无效 token → 401 + TOKEN_INVALID', () => {
  const req = mockReq({ authorization: `Bearer ${INVALID_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'TOKEN_INVALID');
  assert.strictEqual(nextCalled, false);
});

test('过期 token → 401 + TOKEN_EXPIRED', () => {
  const req = mockReq({ authorization: `Bearer ${EXPIRED_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
  assert.strictEqual(nextCalled, false);
});

test('合法 token → req.user 设置 + next() 调用', () => {
  const req = mockReq({ authorization: `Bearer ${VALID_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  authenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.userId, 42);
  assert.strictEqual(req.user.username, 'alice');
  assert.strictEqual(res.statusCode, 200);
});

test('无 Authorization header → 401', () => {
  const req = mockReq({});
  const res = mockRes();
  authenticateToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test('Bearer 前缀缺失 → 401', () => {
  const req = mockReq({ authorization: VALID_TOKEN });
  const res = mockRes();
  authenticateToken(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

console.log('\n=== optionalAuthenticateToken（宽松模式）===');

test('无 token → req.user = null + next()', () => {
  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;
  optionalAuthenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user, null);
});

test('无效 token → 401 + TOKEN_INVALID', () => {
  const req = mockReq({ authorization: `Bearer ${INVALID_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  optionalAuthenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'TOKEN_INVALID');
});

test('合法 token → req.user 设置 + next()', () => {
  const req = mockReq({ authorization: `Bearer ${VALID_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  optionalAuthenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.userId, 42);
});

test('过期 token → 401 + TOKEN_EXPIRED', () => {
  const req = mockReq({ authorization: `Bearer ${EXPIRED_TOKEN}` });
  const res = mockRes();
  let nextCalled = false;
  optionalAuthenticateToken(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
});

console.log('\n=== 安全性回归：不回退默认用户 ===');

test('无 token 时 req.user 不包含 defaultUserId', () => {
  const req = mockReq();
  const res = mockRes();
  authenticateToken(req, res, () => {});
  assert.ok(!req.user || req.user.userId !== config.auth.defaultUserId,
    '不应回退到默认用户');
});

test('无效 token 时 req.user 不包含 defaultUserId', () => {
  const req = mockReq({ authorization: `Bearer ${INVALID_TOKEN}` });
  const res = mockRes();
  authenticateToken(req, res, () => {});
  assert.ok(!req.user || req.user.userId !== config.auth.defaultUserId,
    '不应回退到默认用户');
});

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);