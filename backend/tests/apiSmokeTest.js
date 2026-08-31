/**
 * API Smoke Test — SQLite 模式下启动后端并测试核心 API
 */
const { spawn } = require('child_process');
const http = require('http');

const BACKEND_DIR = require('path').join(__dirname, '..');
const TEST_PORT = 3100 + Math.floor(Math.random() * 500);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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
      const req = http.get(`${BASE_URL}/`, (res) => {
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
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Studentdemo', password: '123456' }),
  });
  assert(loginRes.status === 200, `登录 HTTP 200 (实际 ${loginRes.status})`);
  const loginData = loginRes.json();
  assert(loginData.success === true, '登录 success=true');
  assert(loginData.data && loginData.data.token, '返回 JWT token');
  assert(loginData.data?.user?.id != null, `返回用户 ID (实际 ${loginData.data?.user?.id})`);
  const token = loginData.data.token;

  console.log('\n--- JWT verify ---');
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(verifyRes.status === 200, `verify HTTP 200 (实际 ${verifyRes.status})`);

  console.log('\n--- 学生端范围检查 ---');
  const removedRoleRes = await fetch(`${BASE_URL}/api/teacher/login`, { method: 'POST' });
  assert(removedRoleRes.status === 404, `旧管理端接口已下线 (实际 ${removedRoleRes.status})`);

  console.log('\n--- 诗词列表 ---');
  const poemsRes = await fetch(`${BASE_URL}/api/poems?limit=3`);
  assert(poemsRes.status === 200, `诗词列表 HTTP 200 (实际 ${poemsRes.status})`);

  console.log('\n--- 卡牌游戏保存 ---');
  const saveRes = await fetch(`${BASE_URL}/api/card-game/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ score: 100, wrongCount: 2, correctCount: 8, missedCount: 0, duration: 60, difficultyLevel: 1 }),
  });
  assert(saveRes.status === 200, `卡牌保存 HTTP 200 (实际 ${saveRes.status})`);
  const saveData = saveRes.json();
  assert(saveData.success === true, '卡牌保存 success=true');
  assert(typeof saveData.recordId === 'number', `返回 recordId=${saveData.recordId}`);

  console.log('\n--- 卡牌游戏历史 ---');
  const historyRes = await fetch(`${BASE_URL}/api/card-game/history?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(historyRes.status === 200, `卡牌历史 HTTP 200 (实际 ${historyRes.status})`);

  console.log('\n--- 错题本列表 ---');
  const wrongRes = await fetch(`${BASE_URL}/api/wrong-questions/questions?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(wrongRes.status === 200, `错题本 HTTP 200 (实际 ${wrongRes.status})`);

  console.log('\n--- 首页排行榜 ---');
  const homeRes = await fetch(`${BASE_URL}/api/home/leaderboard/overall`);
  assert(homeRes.status === 200, `首页排行榜 HTTP 200 (实际 ${homeRes.status})`);
}

async function main() {
  console.log('========================================');
  console.log('API Smoke Test (SQLite 模式 — 临时数据库)');
  console.log('========================================');

  const { createTestDb, removeTestDb } = require('./_testDb');
  const tempDbPath = await createTestDb('tmp-smoke');
  console.log(`  临时数据库: ${tempDbPath}`);

  const server = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: TEST_PORT, DB_TYPE: 'sqlite', DB_PATH: tempDbPath, NODE_ENV: 'test' },
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
    console.log(`  临时数据库已清理: ${tempDbPath}`);
    process.exit(failed > 0 ? 1 : 0);
  }, 1500);
}

main();
