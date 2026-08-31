/**
 * 安全回归测试 — IDOR 越权 + 答题防作弊
 *
 * 使用临时 SQLite 数据库，不污染真实 poetry.db
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');
const TEST_PORT = 3500 + Math.floor(Math.random() * 500);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: () => JSON.parse(data), text: () => data }); }
        catch (e) { resolve({ status: res.statusCode, json: () => null, text: () => data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function waitForServer(maxWait = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`${BASE_URL}/api/health`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > maxWait) reject(new Error('服务器启动超时'));
        else setTimeout(check, 500);
      });
      req.setTimeout(2000);
    }
    check();
  });
}

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  [PASS] ${msg}`); }
  else { failed++; console.error(`  [FAIL] ${msg}`); }
}

async function runTests() {
  console.log('\n--- 学生登录 ---');
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Studentdemo', password: '123456' }),
  });
  assert(studentLoginRes.status === 200, `学生登录 HTTP 200 (实际 ${studentLoginRes.status})`);
  const studentData = studentLoginRes.json();
  const studentToken = studentData.data?.token;
  const studentId = studentData.data?.user?.id;

  console.log('\n--- 学生端范围检查 ---');
  const removedRoleRes = await fetch(`${BASE_URL}/api/teacher/dashboard`);
  assert(removedRoleRes.status === 404, `旧管理端接口已下线 (实际 ${removedRoleRes.status})`);

  console.log('\n--- IDOR: 无token访问受保护端点 ---');
  const noTokenRes = await fetch(`${BASE_URL}/api/wrong-questions/questions`, {});
  assert(noTokenRes.status === 401, `无token访问受保护端点返回401 (实际 ${noTokenRes.status})`);

  console.log('\n--- 防作弊: 错误答案+isCorrect=true ---');
  const cheatRes = await fetch(`${BASE_URL}/api/challenge/answer/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({
      level: 1,
      question: '床前明月光',
      userAnswer: '完全错误的答案',
      correctAnswer: '疑是地上霜',
      isCorrect: true,
      poemTitle: '静夜思',
      poemAuthor: '李白',
    }),
  });
  assert(cheatRes.status === 200, `防作弊提交 HTTP 200 (实际 ${cheatRes.status})`);
  if (cheatRes.status === 200) {
    const cheatData = cheatRes.json();
    assert(cheatData.correct === false, `错误答案被正确判定为false (服务端忽略client isCorrect=true)`);
  }

  console.log('\n--- 防作弊: 正确答案+isCorrect=false ---');
  const honestRes = await fetch(`${BASE_URL}/api/challenge/answer/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({
      level: 1,
      question: '床前明月光',
      userAnswer: '疑是地上霜',
      correctAnswer: '疑是地上霜',
      isCorrect: false,
      poemTitle: '静夜思',
      poemAuthor: '李白',
    }),
  });
  assert(honestRes.status === 200, `正确答案提交 HTTP 200 (实际 ${honestRes.status})`);
  if (honestRes.status === 200) {
    const honestData = honestRes.json();
    assert(honestData.correct === true, `正确答案被正确判定为true (服务端忽略client isCorrect=false)`);
  }

  console.log('\n--- JWT: 过期/伪造token ---');
  const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OSwidXNlcm5hbWUiOiJoYWNrZXIiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwMDAwfQ.invalid';
  const fakeRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    headers: { 'Authorization': `Bearer ${fakeJwt}` },
  });
  assert(fakeRes.status === 401, `伪造JWT返回401 (实际 ${fakeRes.status})`);

  console.log('\n--- 健康检查 ---');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert(healthRes.status === 200, `健康检查 HTTP 200 (实际 ${healthRes.status})`);
  const healthData = healthRes.json();
  assert(healthData.status === 'ok' || healthData.status === 'degraded', `健康检查status有效: ${healthData.status}`);
  assert(!!healthData.databaseType, `健康检查返回databaseType: ${healthData.databaseType}`);
}

async function main() {
  console.log('========================================');
  console.log('安全回归测试 (IDOR + 防作弊)');
  console.log('========================================');

  const { createTestDb, removeTestDb } = require('./_testDb');
  const tempDbPath = await createTestDb('tmp-security');
  console.log(`  临时数据库: ${tempDbPath}`);

  const server = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: TEST_PORT, DB_TYPE: 'sqlite', DB_PATH: tempDbPath, NODE_ENV: 'test' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (d) => {
    const s = d.toString().trim();
    if (s && !s.includes('dotenv') && !s.includes('migration')) console.log(`  [server] ${s}`);
  });
  server.stderr.on('data', (d) => {
    const s = d.toString().trim();
    if (s && !s.includes('ECONNREFUSED')) console.error(`  [server!] ${s}`);
  });

  try {
    await waitForServer();
    console.log('  服务器已就绪');
    await runTests();
  } catch (err) {
    console.error('测试失败:', err.message);
    failed++;
  }

  console.log('\n========================================');
  console.log(`结果: ${passed} 通过, ${failed} 失败`);
  console.log('========================================');

  server.kill();
  setTimeout(() => {
    removeTestDb(tempDbPath);
    process.exit(failed > 0 ? 1 : 0);
  }, 1500);
}

main();
