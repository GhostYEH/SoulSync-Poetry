/**
 * 安全回归测试 — IDOR 越权 + 答题防作弊
 *
 * 纯 PostgreSQL 实现，使用动态测试账号
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const db = require('../src/utils/db');
const bcrypt = require('bcrypt');

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

async function createFixtures() {
  const ts = Date.now();
  const studentUsername = `security_student_${ts}`;
  const teacherUsername = `security_teacher_${ts}`;
  const pwdHash = await bcrypt.hash('123456', 10);
  const now = new Date().toISOString();

  // users 表没有 role 列（角色由 class_members 表维护），
  // 插入时必须提供 email / created_at / updated_at（均为 NOT NULL）
  // create student
  const resStudent = await db.query(
    `INSERT INTO users (username, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [studentUsername, `${studentUsername}@test.local`, pwdHash, now, now]
  );
  const studentId = resStudent.rows[0].id;

  // create teacher
  const resTeacher = await db.query(
    `INSERT INTO users (username, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [teacherUsername, `${teacherUsername}@test.local`, pwdHash, now, now]
  );
  const teacherId = resTeacher.rows[0].id;
  
  return { studentUsername, teacherUsername, studentId, teacherId };
}

async function cleanupFixtures(fixtures) {
  if (!fixtures) return;
  await db.query(`DELETE FROM users WHERE id IN ($1, $2)`, [fixtures.studentId, fixtures.teacherId]);
}

async function runTests(fixtures) {
  console.log('\n--- 教师登录 ---');
  const teacherLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixtures.teacherUsername, password: '123456' }),
  });
  
  assert(teacherLoginRes.status === 200, `教师登录 HTTP 200 (实际 ${teacherLoginRes.status})`);
  const teacherData = teacherLoginRes.json();
  const teacherToken = teacherData.token || teacherData.data?.token;
  assert(!!teacherToken, '教师返回 token');

  console.log('\n--- 学生登录 ---');
  const studentLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixtures.studentUsername, password: '123456' }),
  });
  assert(studentLoginRes.status === 200, `学生登录 HTTP 200 (实际 ${studentLoginRes.status})`);
  const studentData = studentLoginRes.json();
  const studentToken = studentData.data?.token;
  const studentId = studentData.data?.user?.id;

  console.log('\n--- IDOR: 教师访问学生详情 ---');
  const detailRes = await fetch(`http://localhost:3000/api/teacher/student/${studentId}/detail`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` },
  });
  assert(detailRes.status === 200 || detailRes.status === 403, `教师访问学生详情返回 200或403 (实际 ${detailRes.status})`);

  console.log('\n--- IDOR: 无效token访问教师端点 ---');
  const invalidRes = await fetch('http://localhost:3000/api/teacher/dashboard', {
    headers: { 'Authorization': 'Bearer invalidtoken123' },
  });
  assert(invalidRes.status === 401, `无效token返回401 (实际 ${invalidRes.status})`);

  console.log('\n--- IDOR: 学生token访问教师端点 ---');
  const crossRes = await fetch('http://localhost:3000/api/teacher/dashboard', {
    headers: { 'Authorization': `Bearer ${studentToken}` },
  });
  assert(crossRes.status === 403, `学生token访问教师端点返回403 (实际 ${crossRes.status})`);

  console.log('\n--- IDOR: 无token访问受保护端点 ---');
  const noTokenRes = await fetch('http://localhost:3000/api/wrong-questions/questions', {});
  assert(noTokenRes.status === 401, `无token访问受保护端点返回401 (实际 ${noTokenRes.status})`);

  console.log('\n--- 防作弊: 错误答案+isCorrect=true ---');
  const cheatRes = await fetch('http://localhost:3000/api/challenge/answer/submit', {
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
  const honestRes = await fetch('http://localhost:3000/api/challenge/answer/submit', {
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
  const fakeRes = await fetch('http://localhost:3000/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${fakeJwt}` },
  });
  assert(fakeRes.status === 401, `伪造JWT返回401 (实际 ${fakeRes.status})`);

  console.log('\n--- 健康检查 ---');
  const healthRes = await fetch('http://localhost:3000/api/health');
  assert(healthRes.status === 200, `健康检查 HTTP 200 (实际 ${healthRes.status})`);
  const healthData = healthRes.json();
  assert(healthData.status === 'ok' || healthData.status === 'degraded', `健康检查status有效: ${healthData.status}`);
  assert(!!healthData.databaseType, `健康检查返回databaseType: ${healthData.databaseType}`);
}

async function main() {
  console.log('========================================');
  console.log('安全回归测试 (IDOR + 防作弊)');
  console.log('========================================');

  if (!process.env.DATABASE_URL) {
    if (process.env.GITHUB_ACTIONS) {
      console.error('  [FAIL] 必须提供 DATABASE_URL 环境变量 (PostgreSQL 测试必须运行)');
      process.exit(1);
    } else {
      console.log('  [SKIPPED] 未提供 DATABASE_URL，本地跳过安全测试');
      process.exit(0);
    }
  }

  let server;
  let fixtures = null;
  try {
    fixtures = await createFixtures();
    console.log(`  创建测试账号: ${fixtures.studentUsername}, ${fixtures.teacherUsername}`);
    
    server = spawn('node', ['server.js'], {
      cwd: BACKEND_DIR,
      env: { ...process.env, NODE_ENV: 'test' },
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

    await waitForServer();
    console.log('  服务器已就绪');
    await runTests(fixtures);
  } catch (err) {
    console.error('测试失败:', err.message);
    failed++;
  } finally {
    if (fixtures) {
      try { await cleanupFixtures(fixtures); } catch(e) { console.error('清理 fixture 失败', e); }
    }
    if (server) server.kill();
    setTimeout(() => {
      process.exit(failed > 0 ? 1 : 0);
    }, 1500);
  }
}

main();