/**
 * 测试辅助 — 从零构建临时 SQLite 数据库
 *
 * 之前的做法是复制本地 db/poetry.db，但该文件被 .gitignore 忽略，
 * CI 环境上不存在，会导致测试直接失败。
 * 现在改为：用 initSqlite 的表结构新建临时库 + 导入诗词 + 创建 Studentdemo 账号，
 * 测试完全自包含，不依赖任何本地文件。
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { DatabaseSync } = require('node:sqlite');
const { SCHEMA_SQL, DEFAULT_POEMS } = require('../scripts/initSqlite');

/**
 * 创建临时测试数据库
 * @param {string} prefix 临时文件名前缀，例如 'tmp-smoke'
 * @returns {Promise<string>} 临时数据库文件路径
 */
async function createTestDb(prefix) {
  const tempDbPath = path.join(__dirname, `${prefix}-${Date.now()}.db`);

  const sqlite = new DatabaseSync(tempDbPath);
  try {
    // 1. 建表
    sqlite.exec(SCHEMA_SQL);

    // 2. 导入默认诗词（ poems 接口和数据加载需要 ）
    const insertPoem = sqlite.prepare(
      'INSERT INTO poems (title, author, dynasty, content) VALUES (?, ?, ?, ?)'
    );
    for (const poem of DEFAULT_POEMS) {
      insertPoem.run(poem.title, poem.author, poem.dynasty, poem.content);
    }

    // 3. 创建测试账号 Studentdemo / 123456
    const passwordHash = await bcrypt.hash('123456', 10);
    const now = new Date().toISOString();
    sqlite.prepare(
      `INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?)`
    ).run('Studentdemo', 'student@demo.test', passwordHash, now, now);
  } finally {
    sqlite.close();
  }

  return tempDbPath;
}

/**
 * 删除临时测试数据库（文件不存在时忽略）
 * @param {string} dbPath 临时数据库文件路径
 */
function removeTestDb(dbPath) {
  try { fs.unlinkSync(dbPath); } catch (e) { /* 忽略 */ }
}

module.exports = { createTestDb, removeTestDb };
