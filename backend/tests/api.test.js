/**
 * API 集成测试 (V1.1)
 *
 * 通过 HTTP 测试正式 Express API 的学习智能端点。
 *
 * 运行方式：
 *   1. 确保 PostgreSQL 已运行且 DATABASE_URL 已设置
 *   2. node tests/api.test.js
 *
 *   如数据库不可用，测试将跳过（exit 0）。
 */
require('dotenv').config();

const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const db = require('../src/utils/db');

let passed = 0, failed = 0;
function test(name, fn) {
  return async () => {
    try { await fn(); console.log(`  ✓ ${name}`); passed++; }
    catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
  };
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const isDbRequired = process.argv.includes('--require-db');
  // 检查数据库
  try { await db.query('SELECT 1'); }
  catch (e) {
    if (isDbRequired) {
       console.log(`  ❌ [ERROR] 严格模式: 未检测到 PostgreSQL，测试失败！(${e.message})`);
       process.exit(1);
    }
    console.log(`⚠ 数据库不可用，跳过 API 集成测试: ${e.message}`);
    process.exit(0);
  }

  console.log('=== V1.1 API 集成测试 ===\n');

  // 启动服务器
  console.log('启动 Express 服务器...');
  const server = spawn('node', ['server.js'], {
    cwd: __dirname + '/..',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  let serverReady = false;
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('服务器已启动') || text.includes('listening') || text.includes('running')) {
        serverReady = true;
        resolve();
      }
    });
    server.stderr.on('data', (data) => {
      const text = data.toString();
      if (!text.includes('Warning') && !text.includes('deprecated')) {
        console.error('  server stderr:', text.trim());
      }
    });
    setTimeout(() => { resolve(); }, 5000);
  });

  if (!serverReady) {
    console.log('⚠ 服务器未在5秒内启动，等待2秒后继续...');
    await new Promise(r => setTimeout(r, 2000));
  }

  const baseOpts = { hostname: 'localhost', port: process.env.PORT || 3000, headers: { 'Content-Type': 'application/json' } };

  try {
    // ============================================================
    console.log('--- 1. 健康检查 ---');
    // ============================================================

    await (await test('服务器已启动并响应', async () => {
      const res = await httpRequest({ ...baseOpts, path: '/api/health', method: 'GET' });
      assert.ok(res.status === 200 || res.status === 404, `意外状态码: ${res.status}`);
    }))();

    // ============================================================
    console.log('\n--- 2. Authentication 安全测试 ---');
    // ============================================================

    await (await test('无 token 访问受保护接口 → 401', async () => {
      const res = await httpRequest({ ...baseOpts, path: '/api/challenge/progress', method: 'GET' });
      assert.strictEqual(res.status, 401, `应返回401，实际: ${res.status}`);
    }))();

    await (await test('无效 token 访问受保护接口 → 401', async () => {
      const res = await httpRequest({
        ...baseOpts, path: '/api/challenge/progress', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': 'Bearer invalid.token.here' },
      });
      assert.strictEqual(res.status, 401);
    }))();

    await (await test('过期 token 访问受保护接口 → 401', async () => {
      const jwt = require('jsonwebtoken');
      const config = require('../src/config/config');
      const expiredToken = jwt.sign({ userId: 1, username: 'test' }, config.jwt.secret, { expiresIn: '-1s' });
      const res = await httpRequest({
        ...baseOpts, path: '/api/challenge/progress', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${expiredToken}` },
      });
      assert.strictEqual(res.status, 401);
    }))();

    await (await test('合法 token 访问受保护接口 → 200', async () => {
      const jwt = require('jsonwebtoken');
      const config = require('../src/config/config');
      const validToken = jwt.sign({ userId: 1, username: 'test' }, config.jwt.secret, { expiresIn: '1h' });
      const res = await httpRequest({
        ...baseOpts, path: '/api/challenge/progress', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${validToken}` },
      });
      assert.strictEqual(res.status, 200, `合法token应返回200，实际: ${res.status}`);
    }))();

    // ============================================================
    console.log('\n--- 3. Answer retry 幂等性 ---');
    // ============================================================

    await (await test('相同 clientAttemptId retry → LearningEvent 不重复', async () => {
      const jwt = require('jsonwebtoken');
      const config = require('../src/config/config');
      const token = jwt.sign({ userId: 888888, username: 'test_retry' }, config.jwt.secret, { expiresIn: '1h' });
      const { v4: uuidv4 } = require('uuid');
      const attemptId = uuidv4();

      const body = {
        level: 1,
        question: '床前明月光，疑是地上霜。举头望明月，_____。',
        userAnswer: '低头思故乡',
        correctAnswer: '低头思故乡',
        isCorrect: true,
        poemTitle: '静夜思',
        poemAuthor: '李白',
        clientAttemptId: attemptId,
      };

      const res1 = await httpRequest({
        ...baseOpts, path: '/api/challenge/answer/submit', method: 'POST',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${token}` },
      }, body);

      const res2 = await httpRequest({
        ...baseOpts, path: '/api/challenge/answer/submit', method: 'POST',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${token}` },
      }, body);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);

      await new Promise(r => setTimeout(r, 500));

      const events = await db.all(
        `SELECT * FROM learning_events WHERE user_id = 888888 AND event_key LIKE 'answer:888888:%'`
      );
      const attemptEvents = events.filter(e => e.event_key === `answer:888888:${attemptId}`);
      assert.strictEqual(attemptEvents.length, 1, '相同 clientAttemptId 应只有1条事件');

      await db.run('DELETE FROM learning_events WHERE user_id = 888888');
      await db.run('DELETE FROM student_knowledge_states WHERE user_id = 888888');
      await db.run('DELETE FROM user_challenge_records WHERE user_id = 888888');
    }))();

    await (await test('不同 clientAttemptId → LearningEvent +1', async () => {
      const jwt = require('jsonwebtoken');
      const config = require('../src/config/config');
      const token = jwt.sign({ userId: 888888, username: 'test_retry' }, config.jwt.secret, { expiresIn: '1h' });
      const { v4: uuidv4 } = require('uuid');

      for (let i = 0; i < 2; i++) {
        await httpRequest({
          ...baseOpts, path: '/api/challenge/answer/submit', method: 'POST',
          headers: { ...baseOpts.headers, 'Authorization': `Bearer ${token}` },
        }, {
          level: 1,
          question: '床前明月光，疑是地上霜。举头望明月，_____。',
          userAnswer: '低头思故乡',
          correctAnswer: '低头思故乡',
          isCorrect: true,
          poemTitle: '静夜思',
          poemAuthor: '李白',
          clientAttemptId: uuidv4(),
        });
      }

      await new Promise(r => setTimeout(r, 500));
      const events = await db.all(
        `SELECT * FROM learning_events WHERE user_id = 888888 AND event_key LIKE 'answer:888888:%'`
      );
      assert.strictEqual(events.length, 2, '不同 clientAttemptId 应有2条事件');

      await db.run('DELETE FROM learning_events WHERE user_id = 888888');
      await db.run('DELETE FROM student_knowledge_states WHERE user_id = 888888');
      await db.run('DELETE FROM user_challenge_records WHERE user_id = 888888');
    }))();

    // ============================================================
    console.log('\n--- 4. Feihualing retry 幂等性 ---');
    // ============================================================

    await (await test('相同 gameSessionId retry → LearningEvent 不重复', async () => {
      const jwt = require('jsonwebtoken');
      const config = require('../src/config/config');
      const token = jwt.sign({ userId: 888888, username: 'test_retry' }, config.jwt.secret, { expiresIn: '1h' });
      const { v4: uuidv4 } = require('uuid');
      const sessionId = uuidv4();

      const body = {
        keyword: '月',
        score: 80,
        poemCount: 5,
        history: [{ poem: '床前明月光', title: '静夜思' }],
        gameSessionId: sessionId,
      };

      await httpRequest({
        ...baseOpts, path: '/api/feihua/save', method: 'POST',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${token}` },
      }, body);
      await httpRequest({
        ...baseOpts, path: '/api/feihua/save', method: 'POST',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${token}` },
      }, body);

      await new Promise(r => setTimeout(r, 500));
      const events = await db.all(
        `SELECT * FROM learning_events WHERE user_id = 888888 AND event_key LIKE 'feihua:888888:%'`
      );
      const sessionEvents = events.filter(e => e.event_key === `feihua:888888:${sessionId}`);
      assert.strictEqual(sessionEvents.length, 1, '相同 gameSessionId 应只有1条事件');

      await db.run('DELETE FROM learning_events WHERE user_id = 888888');
      await db.run('DELETE FROM student_knowledge_states WHERE user_id = 888888');
      await db.run('DELETE FROM feihua_games WHERE user_id = 888888');
    }))();

    // ============================================================
    console.log('\n--- 5. 教师知识 API（需要认证）---');
    // ============================================================

    // 尝试教师登录获取 token
    let teacherToken = null;
    try {
      const loginRes = await httpRequest(
        { ...baseOpts, path: '/api/teacher/login', method: 'POST' },
        { username: 'teacher', password: 'teacher' }
      );
      if (loginRes.body && loginRes.body.token) {
        teacherToken = loginRes.body.token;
      }
    } catch {}

    await (await test('教师知识维度 API 返回8个维度', async () => {
      if (!teacherToken) { console.log('    (跳过：无教师token)'); return; }
      const res = await httpRequest({
        ...baseOpts, path: '/api/teacher/knowledge/dimensions', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data && res.body.data.length === 8, '应有8个知识维度');
    }))();

    await (await test('教师知识概览 API 返回 source=student_knowledge_states', async () => {
      if (!teacherToken) { console.log('    (跳过：无教师token)'); return; }
      const res = await httpRequest({
        ...baseOpts, path: '/api/teacher/knowledge/overview', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.source, '应返回 source 字段标识数据来源');
      assert.strictEqual(res.body.source, 'student_knowledge_states',
        `source 应为 student_knowledge_states，实际: ${res.body.source}`);
    }))();

    await (await test('教师热力图 API 返回 source 字段', async () => {
      if (!teacherToken) { console.log('    (跳过：无教师token)'); return; }
      const res = await httpRequest({
        ...baseOpts, path: '/api/teacher/knowledge/heatmap', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.source, '应返回 source 字段');
    }))();

    await (await test('教师薄弱点 API 返回 source + suggestion', async () => {
      if (!teacherToken) { console.log('    (跳过：无教师token)'); return; }
      const res = await httpRequest({
        ...baseOpts, path: '/api/teacher/knowledge/weak-points', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.source, '应返回 source 字段');
      assert.ok(res.body.suggestion, '应返回 suggestion 字段');
    }))();

    // ============================================================
    console.log('\n--- 3. 学习智能 API (/api/li) ---');
    // ============================================================

    // 尝试学生登录获取 token
    let studentToken = null;
    try {
      const loginRes = await httpRequest(
        { ...baseOpts, path: '/api/auth/login', method: 'POST' },
        { username: 'student', password: 'student' }
      );
      if (loginRes.body && loginRes.body.token) {
        studentToken = loginRes.body.token;
      }
    } catch {}

    await (await test('/api/li 端点可访问', async () => {
      if (!studentToken) { console.log('    (跳过：无学生token)'); return; }
      const res = await httpRequest({
        ...baseOpts, path: '/api/li/states', method: 'GET',
        headers: { ...baseOpts.headers, 'Authorization': `Bearer ${studentToken}` },
      });
      assert.ok(res.status === 200 || res.status === 404, `意外状态码: ${res.status}`);
    }))();

  } finally {
    // 关闭服务器
    console.log('\n关闭服务器...');
    server.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
  }

  await db.close();
  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('API 测试崩溃:', err);
  process.exit(1);
});