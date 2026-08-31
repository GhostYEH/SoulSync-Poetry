const path = require('path');
const fs = require('fs');

const results = { pass: 0, fail: 0 };

function pass(name) {
  console.log('  [PASS] ' + name);
  results.pass++;
}

function fail(name, msg) {
  console.log('  [FAIL] ' + name + ': ' + (msg || ''));
  results.fail++;
}

async function testTransactionCommit(db) {
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
  }
}

async function testTransactionRollback(db) {
  try {
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
  }
}

function testMigrationIdempotency() {
  const { migrate } = require('../src/utils/sqliteMigration');
  const { DatabaseSync } = require('node:sqlite');
  const tmpDb = path.join(__dirname, 'tmp-mig-' + Date.now() + '.db');

  try {
    for (let i = 1; i <= 3; i++) {
      migrate(tmpDb);
      pass('migration run #' + i + ' succeeded');
    }

    const sqlite = new DatabaseSync(tmpDb);
    const removedRoleTables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'teacher%'").all();
    if (removedRoleTables.length !== 0) throw new Error('legacy management tables still exist');
    pass('migration does not recreate legacy management tables');

    const indexes = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
    if (indexes.length < 5) throw new Error('index count too low: ' + indexes.length);
    pass('migration created ' + indexes.length + ' indexes');

    sqlite.close();
  } catch (e) {
    fail('migration idempotency', e.message);
  } finally {
    try { fs.unlinkSync(tmpDb); } catch (e) {}
  }
}

function testEmptyDatabaseMigration() {
  const { DatabaseSync } = require('node:sqlite');
  const tmpDb = path.join(__dirname, 'tmp-empty-' + Date.now() + '.db');

  try {
    const { migrate } = require('../src/utils/sqliteMigration');
    migrate(tmpDb);

    const sqlite = new DatabaseSync(tmpDb);
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(function(t) { return t.name; });

    const required = ['knowledge_points', 'question_knowledge_mappings', 'learning_events', 'student_knowledge_states'];
    var found = true;
    for (var i = 0; i < required.length; i++) {
      if (tableNames.indexOf(required[i]) < 0) { found = false; break; }
    }
    if (!found) throw new Error('missing core table');
    pass('empty database migration created all core tables');

    sqlite.close();
  } catch (e) {
    fail('empty database migration', e.message);
  } finally {
    try { fs.unlinkSync(tmpDb); } catch (e) {}
  }
}

async function main() {
  console.log('========================================');
  console.log('Transaction + Migration Tests');
  console.log('========================================\n');

  // 注意：db.js 在模块加载时就读取 DB_PATH 并固化路径，
  // 所以必须先设置环境变量，再 require
  const tmpDb = path.join(__dirname, 'tmp-tx-' + Date.now() + '.db');
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_PATH = tmpDb;
  const db = require('../src/utils/db');

  await testTransactionCommit(db);
  await testTransactionRollback(db);
  await db.close();
  try { fs.unlinkSync(tmpDb); } catch (e) {}

  testMigrationIdempotency();
  testEmptyDatabaseMigration();

  console.log('\n========================================');
  console.log('Result: ' + results.pass + ' passed, ' + results.fail + ' failed');
  console.log('========================================');

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(function(err) {
  console.error('Test runner error:', err);
  process.exit(1);
});
