const path = require('path');
const fs = require('fs');
const db = require('../src/utils/db');

const results = { pass: 0, fail: 0 };

function pass(name) {
  console.log('  [PASS] ' + name);
  results.pass++;
}

function fail(name, msg) {
  console.log('  [FAIL] ' + name + ': ' + (msg || ''));
  results.fail++;
}

async function testTransactionCommit() {
  try {
    await db.query('CREATE TABLE IF NOT EXISTS tx_test (id INTEGER PRIMARY KEY, name TEXT)');
    await db.run('DELETE FROM tx_test');
    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO tx_test (id, name) VALUES ($1, $2)', [1, 'Alice']);
      await tx.run('INSERT INTO tx_test (id, name) VALUES ($1, $2)', [2, 'Bob']);
    });
    const rows = await db.all('SELECT * FROM tx_test ORDER BY id');
    if (!rows || rows.length !== 2) throw new Error('expected 2 rows, got ' + (rows ? rows.length : 0));
    pass('transaction COMMIT: both rows exist');
  } catch (e) {
    fail('transaction COMMIT', e.message);
  } finally {
    try { await db.run('DROP TABLE IF EXISTS tx_test'); } catch (e) {}
  }
}

async function testTransactionRollback() {
  try {
    await db.query('CREATE TABLE IF NOT EXISTS tx_test (id INTEGER PRIMARY KEY, name TEXT)');
    await db.run('DELETE FROM tx_test');
    try {
      await db.transaction(async (tx) => {
        await tx.run('INSERT INTO tx_test (id, name) VALUES ($1, $2)', [1, 'Alice']);
        throw new Error('intentional failure');
      });
      fail('transaction ROLLBACK: should have thrown');
    } catch (err) {
      if (err.message !== 'intentional failure') throw err;
    }
    const rows = await db.all('SELECT * FROM tx_test');
    if (!rows || rows.length !== 0) throw new Error('expected 0 rows, got ' + (rows ? rows.length : 0));
    pass('transaction ROLLBACK: no rows after error');
  } catch (e) {
    fail('transaction ROLLBACK', e.message);
  } finally {
    try { await db.run('DROP TABLE IF EXISTS tx_test'); } catch (e) {}
  }
}

async function main() {
  console.log('========================================');
  console.log('Transaction Tests (PostgreSQL)');
  console.log('========================================\n');

  if (!process.env.DATABASE_URL) {
    if (process.env.GITHUB_ACTIONS) {
      console.error('  [FAIL] 必须提供 DATABASE_URL 环境变量 (PostgreSQL 测试必须运行)');
      process.exit(1);
    } else {
      console.log('  [SKIPPED] 未提供 DATABASE_URL，本地跳过事务测试');
      process.exit(0);
    }
  }

  await testTransactionCommit();
  await testTransactionRollback();
  await db.close();

  console.log('\n========================================');
  console.log('Result: ' + results.pass + ' passed, ' + results.fail + ' failed');
  console.log('========================================');

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(function(err) {
  console.error('Test runner error:', err);
  process.exit(1);
});