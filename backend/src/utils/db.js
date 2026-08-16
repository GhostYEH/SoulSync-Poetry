const { Pool } = require('pg');
const path = require('path');

const SQLITE_PATH = path.join(__dirname, '..', '..', 'db', 'poetry.db');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL 连接池发生未捕获的错误:', err);
});

// ============================================================================
// SQLite 降级层
// 当 PostgreSQL 不可用时（如本地未启动 PG 服务），自动降级到本地 SQLite
// 保持与 PG 占位符（$1, $2 …）的兼容，内部自动转换为 SQLite 的 ? 占位符
// ============================================================================

let pgAvailable = null;   // null=未探测, true=PG可用, false=已降级到SQLite
let sqliteDb = null;

function getSqliteDb() {
  if (!sqliteDb) {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(SQLITE_PATH);
    console.log(`[db.js] 已降级使用 SQLite: ${SQLITE_PATH}`);
  }
  return sqliteDb;
}

function convertPlaceholders(text) {
  return text.replace(/\$(\d+)/g, '?');
}

function isWriteSql(sql) {
  return /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SET|REPLACE|BEGIN|COMMIT|ROLLBACK)\b/i.test(sql);
}

function sqliteQuery(text, params = []) {
  const sqlite = getSqliteDb();
  const sql = convertPlaceholders(text);
  const stmt = sqlite.prepare(sql);
  if (isWriteSql(sql)) {
    const result = stmt.run(...params);
    return { rows: [], rowCount: result.changes, command: '' };
  }
  const rows = stmt.all(...params);
  return { rows, rowCount: rows.length, command: '' };
}

function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || '';
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET', 'EPIPE', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
    return err.errors.some(e => isConnectionError(e));
  }
  return false;
}

/**
 * 执行参数化 SQL 查询，返回 PG 兼容的 result 对象 { rows, rowCount, ... }。
 * PG 不可用时自动降级到 SQLite。
 * @param {string} text  - SQL 语句，使用 $1, $2 … 占位符
 * @param {any[]}  [params] - 参数数组
 * @returns {Promise<{rows: any[], rowCount: number}>}
 */
async function query(text, params = []) {
  if (pgAvailable === false) {
    return sqliteQuery(text, params);
  }
  try {
    const result = await pool.query(text, params);
    pgAvailable = true;
    return result;
  } catch (err) {
    if (isConnectionError(err)) {
      if (pgAvailable === null) {
        console.warn(`[db.js] PostgreSQL 不可用 (${err.code || err.message})，自动降级到 SQLite`);
      }
      pgAvailable = false;
      return sqliteQuery(text, params);
    }
    throw err;
  }
}

/**
 * 执行参数化 SQL 查询，返回所有匹配行。
 * @param {string} text
 * @param {any[]}  [params]
 * @returns {Promise<any[]>}
 */
async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * 执行参数化 SQL 查询，仅返回第一行。
 * @param {string} text
 * @param {any[]}  [params]
 * @returns {Promise<any|null>}
 */
async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * 执行写操作（INSERT / UPDATE / DELETE / DDL）。
 * @param {string} text
 * @param {any[]}  [params]
 * @returns {Promise<{rowCount: number, rows: any[]}>}
 */
async function run(text, params = []) {
  return query(text, params);
}

/**
 * 关闭连接池与 SQLite 连接（通常在进程退出时调用）。
 */
async function close() {
  try { await pool.end(); } catch (e) { /* ignore */ }
  if (sqliteDb) {
    try { sqliteDb.close(); } catch (e) { /* ignore */ }
    sqliteDb = null;
  }
}

module.exports = { pool, query, all, get, run, close };
