const http = require('http');
const crypto = require('crypto');
const { AIClient, AI_ERRORS, AIError } = require('../src/utils/aiClient');

const PORT = 9999;
const API_URL = `http://localhost:${PORT}/v1/chat`;

async function runTests() {
  let server;
  let requestCount = 0;
  let routeBehavior = 'success'; // 'timeout', '429', '500', 'invalid_json', 'retry_success', 'success'

  // 创建一个测试服务器来模拟 HTTP 边界
  server = http.createServer((req, res) => {
    requestCount++;
    
    if (routeBehavior === 'timeout') {
      // 故意不返回，让客户端超时
      return;
    }
    
    if (routeBehavior === '429') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
      return;
    }

    if (routeBehavior === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
      return;
    }

    if (routeBehavior === 'invalid_json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"choices": [{"message": {"content": "这是一个不完整的 JSON { "}}]}');
      return;
    }

    if (routeBehavior === 'retry_success') {
      if (requestCount < 3) {
        // 前两次返回 502
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Gateway' }));
        return;
      }
      // 第三次成功
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: '{"success": true}' } }] }));
      return;
    }

    // default success
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: '{"result": "success"}' } }] }));
  });

  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}`);

  const client = new AIClient({
    apiKey: 'test-key',
    apiUrl: API_URL,
    model: 'test-model',
    timeout: 1000,
    maxRetries: 2
  });

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition, message) {
    testsTotal++;
    if (condition) {
      testsPassed++;
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. 测试成功返回
    console.log('\n--- 1. Testing Success ---');
    requestCount = 0;
    routeBehavior = 'success';
    const res1 = await client.request({ model: 'test' }, { isJsonResponse: true });
    assert(res1.result === 'success', 'Should parse valid JSON correctly');
    assert(requestCount === 1, 'Should only make 1 request');

    // 2. 测试 500 (会重试)
    console.log('\n--- 2. Testing 500 Retry Exhausted ---');
    requestCount = 0;
    routeBehavior = '500';
    try {
      await client.request({ model: 'test' }, { isJsonResponse: true, maxRetries: 1 });
      assert(false, 'Should throw error on 500');
    } catch (e) {
      assert(e instanceof AIError, 'Error should be AIError');
      assert(e.code === AI_ERRORS.UNAVAILABLE, 'Error code should be UNAVAILABLE');
      assert(requestCount === 2, 'Should retry exactly once (total 2 requests)');
    }

    // 3. 测试 429
    console.log('\n--- 3. Testing 429 Retry ---');
    requestCount = 0;
    routeBehavior = '429';
    try {
      await client.request({ model: 'test' }, { isJsonResponse: true, maxRetries: 1 });
      assert(false, 'Should throw error on 429');
    } catch (e) {
      assert(e.code === AI_ERRORS.RATE_LIMITED, 'Error code should be RATE_LIMITED');
      assert(requestCount === 2, 'Should retry on 429');
    }

    // 4. 测试 Timeout
    console.log('\n--- 4. Testing Timeout ---');
    requestCount = 0;
    routeBehavior = 'timeout';
    try {
      await client.request({ model: 'test' }, { isJsonResponse: true, maxRetries: 1, timeout: 500 });
      assert(false, 'Should throw error on timeout');
    } catch (e) {
      assert(e.code === AI_ERRORS.TIMEOUT, 'Error code should be TIMEOUT');
      assert(requestCount === 2, 'Should retry on timeout');
    }

    // 5. 测试 Invalid JSON
    console.log('\n--- 5. Testing Invalid JSON ---');
    requestCount = 0;
    routeBehavior = 'invalid_json';
    try {
      await client.request({ model: 'test' }, { isJsonResponse: true, maxRetries: 1 });
      assert(false, 'Should throw error on invalid JSON');
    } catch (e) {
      assert(e.code === AI_ERRORS.INVALID_RESPONSE, 'Error code should be INVALID_RESPONSE');
      assert(requestCount === 1, 'Should NOT retry on invalid JSON response');
    }

    // 6. 测试重试后成功
    console.log('\n--- 6. Testing Retry Success ---');
    requestCount = 0;
    routeBehavior = 'retry_success';
    const res6 = await client.request({ model: 'test' }, { isJsonResponse: true, maxRetries: 2 });
    assert(res6.success === true, 'Should succeed after retries');
    assert(requestCount === 3, 'Should succeed on the 3rd attempt');

  } catch (err) {
    console.error('Unhandled error during tests:', err);
  } finally {
    server.close();
    console.log(`\nTests completed: ${testsPassed}/${testsTotal} passed.`);
    process.exit(testsPassed === testsTotal ? 0 : 1);
  }
}

runTests();