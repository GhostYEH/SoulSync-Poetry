/**
 * API Smoke Test — SQLite 模式下启动后端并测试核心 API
 */
const { spawn } = require('child_process');
const http = require('http');

const BACKEND_DIR = require('path').join(__dirname, '..');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(data), text: () => data }));
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
      const req = http.get('http://localhost:3000/', (res) => {
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
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Studentdemo', password: '123456' }),
  });
  assert(loginRes.status === 200, `登录 HTTP 200 (实际 ${loginRes.status})`);
  const loginData = loginRes.json();
  assert(loginData.success === true, '登录 success=true');
  assert(loginData.data && loginData.data.token, '返回 JWT token');
  assert(loginData.data && loginData.data.user && loginData.data.user.id === 356, `user.id=356 (实际 ${loginData.data?.user?.id})`);
  const token = loginData.data.token;

  console.log('\n--- JWT verify ---');
  const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(verifyRes.status === 200, `verify HTTP 200 (实际 ${verifyRes.status})`);

  console.log('\n--- 教师登录 ---');
  const teacherLoginRes = await fetch('http://localhost:3000/api/teacher/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher1', password: '123456' }),
  });
  assert(teacherLoginRes.status === 200, `教师登录 HTTP 200 (实际 ${teacherLoginRes.status})`);
  const teacherData = teacherLoginRes.json();
  const teacherToken = teacherData.token || teacherData.data?.token;
  assert(!!teacherToken, '教师返回 token');

  console.log('\n--- 诗词列表 ---');
  const poemsRes = await fetch('http://localhost:3000/api/poems?limit=3');
  assert(poemsRes.status === 200, `诗词列表 HTTP 200 (实际 ${poemsRes.status})`);

  console.log('\n--- 卡牌游戏保存 ---');
  const saveRes = await fetch('http://localhost:3000/api/card-game/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ score: 100, wrongCount: 2, correctCount: 8, missedCount: 0, duration: 60, difficultyLevel: 1 }),
  });
  assert(saveRes.status === 200, `卡牌保存 HTTP 200 (实际 ${saveRes.status})`);
  const saveData = saveRes.json();
  assert(saveData.success === true, '卡牌保存 success=true');
  assert(typeof saveData.recordId === 'number', `返回 recordId=${saveData.recordId}`);

  console.log('\n--- 卡牌游戏历史 ---');
  const historyRes = await fetch('http://localhost:3000/api/card-game/history?limit=5', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(historyRes.status === 200, `卡牌历史 HTTP 200 (实际 ${historyRes.status})`);

  console.log('\n--- 错题本列表 ---');
  const wrongRes = await fetch('http://localhost:3000/api/wrong-questions/questions?limit=5', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(wrongRes.status === 200, `错题本 HTTP 200 (实际 ${wrongRes.status})`);

  console.log('\n--- 首页排行榜 ---');
  const homeRes = await fetch('http://localhost:3000/api/home/leaderboard/overall');
  assert(homeRes.status === 200, `首页排行榜 HTTP 200 (实际 ${homeRes.status})`);
}

async function main() {
  console.log('========================================');
  console.log('API Smoke Test (PostgreSQL Integration)');
  console.log('========================================');

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/poetry_db'
  });

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.log(`  [SKIPPED] 未检测到 PostgreSQL 实例，Smoke Test 被跳过 (${err.message})`);
    process.exit(0);
  } finally {
    pool.end();
  }

  const server = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/poetry_db' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (d) => {
    const s = d.toString().trim();
    if (s && !s.includes('dotenv')) console.log(`  [server] ${s}`);
  });
  server.stderr.on('data', (d) => {
    const s = d.toString().trim();
    if (s && !s.includes('ECONNREFUSED')) console.error(`  [server!] ${s}`);
  });

  try {
    await waitForServer(5000); // 使用真实 PostgreSQL 的正常等待时间
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
    process.exit(failed > 0 ? 1 : 0);
  }, 1500);
}

main();