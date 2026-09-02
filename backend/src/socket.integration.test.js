const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const config = require('./config/config');

const PORT = 3317;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

function waitForEvent(socket, event, predicate = () => true, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`等待 Socket 事件超时: ${event}`));
    }, timeoutMs);

    const onEvent = (data) => {
      if (!predicate(data)) return;
      clearTimeout(timer);
      socket.off(event, onEvent);
      resolve(data);
    };

    socket.on(event, onEvent);
  });
}

function connectAuthenticated(userId, username) {
  const token = jwt.sign(
    { userId: String(userId), username },
    config.jwt.secret,
    { expiresIn: '5m' }
  );

  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`用户 ${userId} Socket 认证超时`));
    }, 10000);

    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
    socket.once('authenticated', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect', () => {
      socket.emit('authenticate', { token });
    });
  });
}

function startBackend() {
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gushici-socket-test-'));
  const dbPath = path.join(dbDir, 'poetry.db');
  const bootstrap = [
    "const config = require('./src/config/config');",
    `config.server.port = ${PORT};`,
    "config.server.host = '127.0.0.1';",
    `process.env.PORT = '${PORT}';`,
    `process.env.DB_PATH = ${JSON.stringify(dbPath)};`,
    "require('./server');"
  ].join(' ');
  const child = spawn(process.execPath, ['-e', bootstrap], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`后端启动超时\n${output}`)), 30000);
    const check = () => {
      if (output.includes(`服务器运行在 http://localhost:${PORT}`)) {
        clearTimeout(timer);
        resolve();
      } else if (child.exitCode !== null) {
        clearTimeout(timer);
        reject(new Error(`后端提前退出，退出码 ${child.exitCode}\n${output}`));
      }
    };
    child.stdout.on('data', check);
    child.stderr.on('data', check);
    child.on('exit', check);
  });

  return { child, ready, dbDir, getOutput: () => output };
}

test('真实后端支持双客户端匹配、同时答题、推进下一题和断线结束', { timeout: 50000 }, async () => {
  const backend = startBackend();
  let playerA;
  let playerB;

  try {
    await backend.ready;
    const corsProbe = await fetch(`${SERVER_URL}/socket.io/?EIO=4&transport=polling`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert.equal(corsProbe.status, 204);
    assert.equal(corsProbe.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    [playerA, playerB] = await Promise.all([
      connectAuthenticated('990001', '集成测试甲'),
      connectAuthenticated('990002', '集成测试乙')
    ]);

    const startedA = waitForEvent(playerA, 'challenge-dual-started');
    const startedB = waitForEvent(playerB, 'challenge-dual-started');
    playerA.emit('challenge-match-start', { username: '集成测试甲' });
    playerB.emit('challenge-match-start', { username: '集成测试乙' });
    const [gameA, gameB] = await Promise.all([startedA, startedB]);

    assert.equal(gameA.mode, 'dual');
    assert.equal(gameB.id, gameA.id);
    assert.equal(gameA.currentQuestionIndex, 0);
    assert.equal(gameA.players.length, 2);
    assert.ok(gameA.currentQuestion?.answer, '匹配房间必须下发当前题目答案用于测试答题');

    const firstUpdateA = waitForEvent(playerA, 'challenge-dual-answer-update', data => data.playerId === '990001');
    const firstUpdateB = waitForEvent(playerB, 'challenge-dual-answer-update', data => data.playerId === '990001');
    playerA.emit('challenge-dual-answer', {
      roomId: gameA.id,
      answer: gameA.currentQuestion.answer
    });
    const [answerA, answerB] = await Promise.all([firstUpdateA, firstUpdateB]);
    assert.equal(answerA.isCorrect, true);
    assert.equal(answerB.bothAnswered, false);

    const nextA = waitForEvent(playerA, 'challenge-dual-next');
    const nextB = waitForEvent(playerB, 'challenge-dual-next');
    const secondUpdateA = waitForEvent(playerA, 'challenge-dual-answer-update', data => data.playerId === '990002');
    const secondUpdateB = waitForEvent(playerB, 'challenge-dual-answer-update', data => data.playerId === '990002');
    playerB.emit('challenge-dual-answer', {
      roomId: gameA.id,
      answer: gameA.currentQuestion.answer
    });
    await Promise.all([secondUpdateA, secondUpdateB]);

    const [round2A, round2B] = await Promise.all([nextA, nextB]);
    assert.equal(round2A.currentQuestionIndex, 1);
    assert.equal(round2B.currentQuestionIndex, 1);
    assert.ok(round2A.currentQuestion?.question);
    assert.ok(round2A.currentQuestion?.answer);

    const finished = waitForEvent(playerB, 'challenge-dual-finished', data => data.reason === 'quit');
    playerA.disconnect();
    const finishedResult = await finished;
    assert.equal(String(finishedResult.winner.id), '990002');
    assert.equal(String(finishedResult.loser.id), '990001');
  } finally {
    playerA?.disconnect();
    playerB?.disconnect();
    if (backend.child.exitCode === null) {
      backend.child.kill();
      await new Promise(resolve => backend.child.once('exit', resolve));
    }
    fs.rmSync(backend.dbDir, { recursive: true, force: true });
  }
});
