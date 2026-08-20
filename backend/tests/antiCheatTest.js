/**
 * 防作弊 + 输入验证测试
 *
 * 测试范围:
 * 1. 答题防作弊: 服务端忽略客户端 isCorrect
 * 2. 卡牌游戏: score 边界验证
 * 3. 飞花令: 必填字段验证
 * 4. 诗词挑战: 评分边界验证
 * 5. 错题本: 必填字段验证
 *
 * 使用临时 SQLite 数据库，不污染真实 poetry.db
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');

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
      const req = http.get('http://localhost:3000/api/health', (res) => {
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
  const loginData = loginRes.json();
  const token = loginData.data?.token;
  assert(!!token, '学生登录成功获取token');

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // ==================== 答题防作弊 ====================
  console.log('\n--- 答题防作弊: challengeService 服务端判定 ---');

  const correctQuestion = '床前明月光，疑是地上霜。举头望明月，_____。';
  const correctAnswer = '低头思故乡';

  const cheat1Res = await fetch('http://localhost:3000/api/challenge/answer/submit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      level: 1,
      question: correctQuestion,
      userAnswer: '错误答案',
      correctAnswer: correctAnswer,
      isCorrect: true,
    }),
  });
  const cheat1Data = cheat1Res.json();
  assert(cheat1Res.status === 200, `错误答案+isCorrect=true → HTTP 200 (实际 ${cheat1Res.status})`);
  assert(cheat1Data.correct === false, '服务端判定 correct=false (忽略client isCorrect=true)');

  const cheat2Res = await fetch('http://localhost:3000/api/challenge/answer/submit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      level: 1,
      question: correctQuestion,
      userAnswer: correctAnswer,
      correctAnswer: correctAnswer,
      isCorrect: false,
    }),
  });
  const cheat2Data = cheat2Res.json();
  assert(cheat2Res.status === 200, `正确答案+isCorrect=false → HTTP 200 (实际 ${cheat2Res.status})`);
  assert(cheat2Data.correct === true, '服务端判定 correct=true (忽略client isCorrect=false)');

  // ==================== 卡牌游戏 score 边界 ====================
  console.log('\n--- 卡牌游戏: score 边界验证 ---');

  const oversizeScoreRes = await fetch('http://localhost:3000/api/card-game/save', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ score: 999999, wrongCount: 0, correctCount: 1, missedCount: 0, duration: 10, difficultyLevel: 1 }),
  });
  assert(oversizeScoreRes.status === 400, `score=999999 → HTTP 400 (实际 ${oversizeScoreRes.status})`);

  const missingScoreRes = await fetch('http://localhost:3000/api/card-game/save', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ wrongCount: 0, correctCount: 1 }),
  });
  assert(missingScoreRes.status === 400, `缺少score → HTTP 400 (实际 ${missingScoreRes.status})`);

  const validScoreRes = await fetch('http://localhost:3000/api/card-game/save', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ score: 500, wrongCount: 1, correctCount: 5, missedCount: 0, duration: 30, difficultyLevel: 2 }),
  });
  assert(validScoreRes.status === 200, `score=500 → HTTP 200 (实际 ${validScoreRes.status})`);

  // ==================== 飞花令 必填字段 ====================
  console.log('\n--- 飞花令: 必填字段验证 ---');

  const feihuaMissingKeyword = await fetch('http://localhost:3000/api/feihua/save', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ score: 100, poemCount: 5, history: [] }),
  });
  assert(feihuaMissingKeyword.status === 400, `缺少keyword → HTTP 400 (实际 ${feihuaMissingKeyword.status})`);

  const feihuaMissingHistory = await fetch('http://localhost:3000/api/feihua/save', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ keyword: '月', score: 100, poemCount: 5 }),
  });
  assert(feihuaMissingHistory.status === 400, `缺少history → HTTP 400 (实际 ${feihuaMissingHistory.status})`);

  // ==================== 诗词挑战 评分边界 ====================
  console.log('\n--- 诗词挑战: 评分边界验证 ---');

  const rateZeroRes = await fetch('http://localhost:3000/api/poetry-challenge/rate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ challengeId: 1, score: 0 }),
  });
  assert(rateZeroRes.status === 400, `score=0 → HTTP 400 (实际 ${rateZeroRes.status})`);

  const rateElevenRes = await fetch('http://localhost:3000/api/poetry-challenge/rate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ challengeId: 1, score: 11 }),
  });
  assert(rateElevenRes.status === 400, `score=11 → HTTP 400 (实际 ${rateElevenRes.status})`);

  const rateMissingTheme = await fetch('http://localhost:3000/api/poetry-challenge/generate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ keyword: '月' }),
  });
  assert(rateMissingTheme.status === 400, `缺少theme → HTTP 400 (实际 ${rateMissingTheme.status})`);

  // ==================== 错题本 必填字段 ====================
  console.log('\n--- 错题本: 必填字段验证 ---');

  const wqMissingQuestion = await fetch('http://localhost:3000/api/wrong-questions/add', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ answer: '正确答案', user_answer: '我的答案' }),
  });
  assert(wqMissingQuestion.status === 400, `缺少question → HTTP 400 (实际 ${wqMissingQuestion.status})`);

  const wqMissingAnswer = await fetch('http://localhost:3000/api/wrong-questions/add', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ question: '题目', user_answer: '我的答案' }),
  });
  assert(wqMissingAnswer.status === 400, `缺少answer → HTTP 400 (实际 ${wqMissingAnswer.status})`);

  // ==================== 答题 必填字段 ====================
  console.log('\n--- 答题: 必填字段验证 ---');

  const challengeMissingQuestion = await fetch('http://localhost:3000/api/challenge/answer/submit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ level: 1, userAnswer: '答案', isCorrect: true }),
  });
  assert(challengeMissingQuestion.status === 400, `缺少question → HTTP 400 (实际 ${challengeMissingQuestion.status})`);

  const challengeMissingAnswer = await fetch('http://localhost:3000/api/challenge/answer/submit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ level: 1, question: correctQuestion, isCorrect: true }),
  });
  assert(challengeMissingAnswer.status === 400, `缺少userAnswer → HTTP 400 (实际 ${challengeMissingAnswer.status})`);
}

async function main() {
  console.log('========================================');
  console.log('防作弊 + 输入验证测试');
  console.log('========================================');

  const realDbPath = path.join(BACKEND_DIR, 'db', 'poetry.db');
  const tempDbPath = path.join(BACKEND_DIR, 'tests', `tmp-cheat-${Date.now()}.db`);
  fs.copyFileSync(realDbPath, tempDbPath);
  console.log(`  临时数据库: ${tempDbPath}`);

  const server = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DB_TYPE: 'sqlite', DB_PATH: tempDbPath, NODE_ENV: 'test' },
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
    try { fs.unlinkSync(tempDbPath); } catch (e) {}
    process.exit(failed > 0 ? 1 : 0);
  }, 1500);
}

main();