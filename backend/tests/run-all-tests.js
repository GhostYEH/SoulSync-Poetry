/**
 * 统一测试运行器
 *
 * 运行所有单元测试（不依赖数据库）并统计结果。
 * 集成测试和 API 测试依赖 PostgreSQL，如不可用则跳过。
 *
 * 运行: node tests/run-all-tests.js
 */
const { execSync } = require('child_process');
const path = require('path');

const unitTests = [
  { name: 'learningCore.test.js', file: 'tests/learningCore.test.js', desc: 'Weighted Bayesian Evidence Model 算法' },
  { name: 'auth.test.js', file: 'tests/auth.test.js', desc: '认证中间件安全' },
  { name: 'idempotency.test.js', file: 'tests/idempotency.test.js', desc: 'eventKey 幂等性' },
  { name: 'abilityAggregation.test.js', file: 'tests/abilityAggregation.test.js', desc: '能力聚合与 Source of Truth' },
];

const integrationTests = [
  { name: 'integration.test.js', file: 'tests/integration.test.js', desc: 'PostgreSQL 集成测试' },
  { name: 'api.test.js', file: 'tests/api.test.js', desc: 'API 集成测试' },
  { name: 'concurrency.test.js', file: 'tests/concurrency.test.js', desc: '并发控制与事务回滚' },
];

let totalPassed = 0;
let totalFailed = 0;
let results = [];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     SoulSync-Poetry Learning Intelligence Core 测试套件     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('━━━ 单元测试（不依赖数据库）━━━\n');
for (const t of unitTests) {
  try {
    const out = execSync(`node ${t.file}`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30000,
    });
    const match = out.match(/===\s*结果:\s*(\d+)\s*通过,\s*(\d+)\s*失败/);
    const passed = match ? parseInt(match[1]) : 0;
    const failed = match ? parseInt(match[2]) : 0;
    totalPassed += passed;
    totalFailed += failed;
    results.push({ ...t, passed, failed, status: failed === 0 ? 'PASS' : 'FAIL' });
    console.log(`  ${failed === 0 ? '✓' : '✗'} ${t.name} (${t.desc}): ${passed} 通过, ${failed} 失败`);
  } catch (e) {
    results.push({ ...t, passed: 0, failed: 1, status: 'ERROR' });
    console.log(`  ✗ ${t.name}: ERROR - ${e.message.slice(0, 80)}`);
    totalFailed++;
  }
}

console.log('\n━━━ 集成测试（依赖 PostgreSQL）━━━\n');
let dbAvailable = false;
try {
  require('dotenv').config();
  const db = require('../src/utils/db');
  execSync('node -e "require(\'./src/utils/db\').query(\'SELECT 1\').then(()=>{console.log(\'OK\');process.exit(0)}).catch(()=>process.exit(1))"', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 5000,
  });
  dbAvailable = true;
} catch {}

if (!dbAvailable) {
  console.log('  ⚠ PostgreSQL 不可用');
  console.log('  ⚠ 集成测试和 API 测试: SKIPPED');
  for (const t of integrationTests) {
    results.push({ ...t, passed: 0, failed: 0, status: 'SKIPPED' });
  }
} else {
  for (const t of integrationTests) {
    try {
      const out = execSync(`node ${t.file}`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 120000,
      });
      const match = out.match(/===\s*结果:\s*(\d+)\s*通过,\s*(\d+)\s*失败/);
      const passed = match ? parseInt(match[1]) : 0;
      const failed = match ? parseInt(match[2]) : 0;
      totalPassed += passed;
      totalFailed += failed;
      results.push({ ...t, passed, failed, status: failed === 0 ? 'PASS' : 'FAIL' });
      console.log(`  ${failed === 0 ? '✓' : '✗'} ${t.name} (${t.desc}): ${passed} 通过, ${failed} 失败`);
    } catch (e) {
      results.push({ ...t, passed: 0, failed: 1, status: 'ERROR' });
      console.log(`  ✗ ${t.name}: ERROR`);
      totalFailed++;
    }
  }
}

console.log('\n━━━ 汇总 ━━━');
console.log(`  单元测试: ${results.filter(r => r.status === 'PASS').length} 通过, ${results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length} 失败`);
console.log(`  集成测试: ${results.filter(r => r.status === 'NOT RUN').length} NOT RUN`);
console.log(`  总测试数: ${totalPassed} 通过, ${totalFailed} 失败`);
console.log(`  算法版本: Weighted Bayesian Evidence Model v2`);
console.log('');

module.exports = { results, totalPassed, totalFailed, dbAvailable };